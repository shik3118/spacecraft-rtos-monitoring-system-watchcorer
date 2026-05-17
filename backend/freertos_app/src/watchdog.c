#include "watchdog.h"

#include <stdio.h>
#include <string.h>

#include "config.h"
#include "event_manager.h"
#include "logger.h"
#include "monitoring_tasks.h"
#include "system_state.h"

typedef struct
{
    SubsystemId subsystem;
    TickType_t timeout_ticks;
    TickType_t last_heartbeat_tick;
    TickType_t last_restart_tick;

    uint16_t restart_count;
    uint16_t restart_limit;

    TickType_t restart_cooldown_ticks;
    TickType_t recovery_grace_ticks;

    bool registered;
    bool critical_for_safe_mode;
    WatchdogRecoveryState state;

    WatchdogRecoveryFn recovery_fn;
    void *recovery_context;
} WatchdogSlot;

typedef struct
{
    SubsystemId subsystem;
    TickType_t tick;
} HeartbeatMessage;

static QueueHandle_t g_qHeartbeats = NULL;
static TaskHandle_t g_watchdogTask = NULL;
static TaskHandle_t g_safeModeBeaconTask = NULL;
static SemaphoreHandle_t g_registryMutex = NULL;

static WatchdogSlot g_slots[SUBSYSTEM_MAX];

static WatchdogHistoryRecord g_history[WD_HISTORY_DEPTH];
static size_t g_history_head = 0U;
static size_t g_history_count = 0U;

static bool g_safeModeActive = false;
static bool g_safeModeRequestPending = false;
static char g_safeModeRequestReason[96];

static WatchdogSlot *find_slot(SubsystemId subsystem)
{
    for (size_t i = 0; i < SUBSYSTEM_MAX; ++i)
    {
        if (g_slots[i].registered && g_slots[i].subsystem == subsystem)
        {
            return &g_slots[i];
        }
    }
    return NULL;
}

static WatchdogSlot *allocate_slot(SubsystemId subsystem)
{
    for (size_t i = 0; i < SUBSYSTEM_MAX; ++i)
    {
        if (!g_slots[i].registered)
        {
            g_slots[i].registered = true;
            g_slots[i].subsystem = subsystem;
            g_slots[i].state = WD_SLOT_HEALTHY;
            return &g_slots[i];
        }
    }
    return NULL;
}

static void push_history_locked(SubsystemId subsystem,
                                WatchdogHistoryType type,
                                WatchdogRecoveryState state,
                                uint16_t restart_count,
                                const char *detail)
{
    WatchdogHistoryRecord *rec = &g_history[g_history_head];
    rec->tick = xTaskGetTickCount();
    rec->subsystem = subsystem;
    rec->type = type;
    rec->state = state;
    rec->restart_count = restart_count;
    (void)snprintf(rec->detail, sizeof(rec->detail), "%s", (detail != NULL) ? detail : "");

    g_history_head = (g_history_head + 1U) % WD_HISTORY_DEPTH;
    if (g_history_count < WD_HISTORY_DEPTH)
    {
        g_history_count++;
    }
}

static void publish_watchdog_event(SubsystemId subsystem,
                                   EventType type,
                                   HealthLevel level,
                                   float metric,
                                   const char *description)
{
    SystemEvent ev = {
        .tick = xTaskGetTickCount(),
        .type = type,
        .source = subsystem,
        .level = level,
        .metric_value = metric,
    };

    (void)snprintf(ev.description, sizeof(ev.description), "%s", (description != NULL) ? description : "");
    (void)EventManager_PublishEvent(&ev, pdMS_TO_TICKS(10));
}

static bool default_recovery_callback(SubsystemId subsystem, void *context)
{
    (void)context;

    /* Delete + recreate pattern to restore task lifecycle deterministically. */
    const bool deleted = MonitoringTasks_SetSubsystemEnabled(subsystem, false);
    vTaskDelay(pdMS_TO_TICKS(10));
    const bool recreated = MonitoringTasks_SetSubsystemEnabled(subsystem, true);

    return (deleted && recreated);
}

static bool invoke_recovery(WatchdogSlot *slot)
{
    const WatchdogRecoveryFn fn = (slot->recovery_fn != NULL) ? slot->recovery_fn : default_recovery_callback;
    return fn(slot->subsystem, slot->recovery_context);
}

static void apply_minimal_survival_profile(void)
{
    /* Minimal survival set: CPU + Heap/Stack + Watchdog + Telemetry + Logger. */
    (void)MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_SENSOR_HEALTH, false);
    (void)MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_COMMUNICATION, false);

    (void)MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_CPU, true);
    (void)MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_HEAP_STACK, true);
}

static void safe_mode_beacon_task(void *params)
{
    (void)params;
    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_WARN, "watchdog", "safe-mode emergency beacon task started");

    for (;;)
    {
        publish_watchdog_event(SUBSYSTEM_WATCHDOG,
                               EVENT_TYPE_SAFE_MODE,
                               HEALTH_WARNING,
                               0.0f,
                               "safe-mode beacon: degraded survival profile active");

        if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(20)) == pdTRUE)
        {
            push_history_locked(SUBSYSTEM_WATCHDOG,
                                WD_HISTORY_BEACON,
                                WD_SLOT_SAFE_MODE_LOCKED,
                                0U,
                                "safe-mode beacon emitted");
            (void)xSemaphoreGive(g_registryMutex);
        }

        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_WD_BEACON_MS));
    }
}

void Watchdog_EnterSafeMode(const char *reason)
{
    if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(50)) != pdTRUE)
    {
        return;
    }

    if (g_safeModeActive)
    {
        (void)xSemaphoreGive(g_registryMutex);
        return;
    }

    g_safeModeActive = true;

    for (size_t i = 0; i < SUBSYSTEM_MAX; ++i)
    {
        if (g_slots[i].registered)
        {
            g_slots[i].state = WD_SLOT_SAFE_MODE_LOCKED;
        }
    }

    push_history_locked(SUBSYSTEM_WATCHDOG,
                        WD_HISTORY_SAFE_MODE_ESCALATION,
                        WD_SLOT_SAFE_MODE_LOCKED,
                        0U,
                        (reason != NULL) ? reason : "safe mode entered");

    (void)xEventGroupSetBits(EventManager_GetSystemEventGroup(), EVT_BIT_SAFE_MODE_ACTIVE);
    (void)xEventGroupClearBits(EventManager_GetSystemEventGroup(), EVT_BIT_WATCHDOG_OK);

    (void)SystemState_TransitionTo(SYSTEM_MODE_SAFE,
                                   (reason != NULL) ? reason : "watchdog escalation",
                                   SUBSYSTEM_WATCHDOG);

    apply_minimal_survival_profile();

    if (g_safeModeBeaconTask == NULL)
    {
        (void)xTaskCreate(safe_mode_beacon_task,
                          "TaskSafeBeacon",
                          STACK_SIZE_SAFE_MODE,
                          NULL,
                          PRIO_EMERGENCY_RESPONSE,
                          &g_safeModeBeaconTask);
    }

    Logger_Log(LOG_ERROR,
               "watchdog",
               "safe mode escalation activated reason=%s",
               (reason != NULL) ? reason : "n/a");

    (void)xSemaphoreGive(g_registryMutex);
}

void Watchdog_ExitSafeMode(const char *reason)
{
    if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(50)) != pdTRUE)
    {
        return;
    }

    if (!g_safeModeActive)
    {
        (void)xSemaphoreGive(g_registryMutex);
        return;
    }

    g_safeModeActive = false;

    if (g_safeModeBeaconTask != NULL)
    {
        TaskHandle_t beacon = g_safeModeBeaconTask;
        g_safeModeBeaconTask = NULL;
        vTaskDelete(beacon);
    }

    for (size_t i = 0; i < SUBSYSTEM_MAX; ++i)
    {
        if (g_slots[i].registered)
        {
            g_slots[i].state = WD_SLOT_COOLDOWN;
            g_slots[i].last_restart_tick = xTaskGetTickCount();
        }
    }

    (void)xEventGroupClearBits(EventManager_GetSystemEventGroup(), EVT_BIT_SAFE_MODE_ACTIVE);

    /* Leave in degraded operation after safe-mode release. */
    (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED,
                                   (reason != NULL) ? reason : "safe mode released",
                                   SUBSYSTEM_WATCHDOG);

    (void)MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_SENSOR_HEALTH, true);
    (void)MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_COMMUNICATION, true);

    Logger_Log(LOG_WARN,
               "watchdog",
               "safe mode exited -> DEGRADED reason=%s",
               (reason != NULL) ? reason : "n/a");

    (void)xSemaphoreGive(g_registryMutex);
}

bool Watchdog_IsSafeModeActive(void)
{
    bool active = false;

    if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(20)) == pdTRUE)
    {
        active = g_safeModeActive;
        (void)xSemaphoreGive(g_registryMutex);
    }

    return active;
}

static void process_heartbeat_queue(void)
{
    for (uint8_t i = 0; i < 12U; ++i)
    {
        HeartbeatMessage hb;
        if (xQueueReceive(g_qHeartbeats, &hb, 0) != pdTRUE)
        {
            break;
        }

        WatchdogSlot *slot = find_slot(hb.subsystem);
        if (slot != NULL)
        {
            slot->last_heartbeat_tick = hb.tick;
            if (slot->state != WD_SLOT_SAFE_MODE_LOCKED)
            {
                slot->state = WD_SLOT_HEALTHY;
            }
        }
    }
}

static void request_safe_mode_locked(const char *reason)
{
    g_safeModeRequestPending = true;
    (void)snprintf(g_safeModeRequestReason,
                   sizeof(g_safeModeRequestReason),
                   "%s",
                   (reason != NULL) ? reason : "watchdog escalation request");
}

static void process_slot_recovery(WatchdogSlot *slot, TickType_t now)
{
    const TickType_t elapsed = now - slot->last_heartbeat_tick;

    if (elapsed <= slot->timeout_ticks)
    {
        if ((slot->state == WD_SLOT_COOLDOWN) &&
            ((now - slot->last_restart_tick) >= slot->restart_cooldown_ticks))
        {
            slot->state = WD_SLOT_HEALTHY;
        }
        return;
    }

    if (((slot->state == WD_SLOT_RECOVERING) || (slot->state == WD_SLOT_COOLDOWN)) &&
        ((now - slot->last_restart_tick) <= slot->recovery_grace_ticks))
    {
        return;
    }

    /* Timeout detected */
    slot->state = WD_SLOT_TIMEOUT_DETECTED;

    Logger_Log(LOG_ERROR,
               "watchdog",
               "timeout subsystem=%s elapsed=%lu timeout=%lu restart_count=%u",
               EventManager_SubsystemToString(slot->subsystem),
               (unsigned long)elapsed,
               (unsigned long)slot->timeout_ticks,
               (unsigned)slot->restart_count);

    push_history_locked(slot->subsystem,
                        WD_HISTORY_TIMEOUT,
                        slot->state,
                        slot->restart_count,
                        "heartbeat timeout detected");

    publish_watchdog_event(slot->subsystem,
                           EVENT_TYPE_WATCHDOG,
                           HEALTH_CRITICAL,
                           (float)elapsed,
                           "watchdog timeout detected");

    if ((now - slot->last_restart_tick) < slot->restart_cooldown_ticks)
    {
        slot->state = WD_SLOT_COOLDOWN;
        Logger_Log(LOG_WARN,
                   "watchdog",
                   "recovery cooldown active subsystem=%s remaining=%lu",
                   EventManager_SubsystemToString(slot->subsystem),
                   (unsigned long)(slot->restart_cooldown_ticks - (now - slot->last_restart_tick)));
        return;
    }

    if (slot->restart_count >= slot->restart_limit)
    {
        slot->state = WD_SLOT_FAILED_LOCKED;

        Logger_Log(LOG_ERROR,
                   "watchdog",
                   "restart limit exceeded subsystem=%s limit=%u",
                   EventManager_SubsystemToString(slot->subsystem),
                   (unsigned)slot->restart_limit);

        push_history_locked(slot->subsystem,
                            WD_HISTORY_SAFE_MODE_ESCALATION,
                            slot->state,
                            slot->restart_count,
                            "restart limit exceeded");

        if (slot->critical_for_safe_mode)
        {
            request_safe_mode_locked("critical subsystem exceeded watchdog restart limit");
        }
        return;
    }

    slot->state = WD_SLOT_RECOVERING;
    slot->restart_count++;

    push_history_locked(slot->subsystem,
                        WD_HISTORY_RESTART_ATTEMPT,
                        slot->state,
                        slot->restart_count,
                        "delete+recreate recovery attempt");

    Logger_Log(LOG_WARN,
               "watchdog",
               "recovery attempt subsystem=%s count=%u/%u",
               EventManager_SubsystemToString(slot->subsystem),
               (unsigned)slot->restart_count,
               (unsigned)slot->restart_limit);

    const bool recovered = invoke_recovery(slot);

    slot->last_restart_tick = now;
    slot->last_heartbeat_tick = now;

    if (recovered)
    {
        slot->state = WD_SLOT_COOLDOWN;

        push_history_locked(slot->subsystem,
                            WD_HISTORY_RECOVERY_SUCCESS,
                            slot->state,
                            slot->restart_count,
                            "recovery succeeded");

        publish_watchdog_event(slot->subsystem,
                               EVENT_TYPE_DIAGNOSTIC,
                               HEALTH_WARNING,
                               (float)slot->restart_count,
                               "watchdog recovery success: subsystem restarted");

        (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED,
                                       "watchdog restart recovery applied",
                                       SUBSYSTEM_WATCHDOG);
    }
    else
    {
        slot->state = WD_SLOT_FAILED_LOCKED;

        push_history_locked(slot->subsystem,
                            WD_HISTORY_RECOVERY_FAILURE,
                            slot->state,
                            slot->restart_count,
                            "recovery failed");

        publish_watchdog_event(slot->subsystem,
                               EVENT_TYPE_WATCHDOG,
                               HEALTH_CRITICAL,
                               (float)slot->restart_count,
                               "watchdog recovery failed");

        if (slot->critical_for_safe_mode)
        {
            request_safe_mode_locked("critical watchdog recovery failure");
        }
    }
}

static void watchdog_task(void *params)
{
    (void)params;

    TickType_t last_wake = xTaskGetTickCount();
    Logger_Log(LOG_INFO, "watchdog", "watchdog supervisor started");

    for (;;)
    {
        if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(25)) == pdTRUE)
        {
            process_heartbeat_queue();

            bool all_healthy = true;
            const TickType_t now = xTaskGetTickCount();

            for (size_t i = 0; i < SUBSYSTEM_MAX; ++i)
            {
                if (!g_slots[i].registered)
                {
                    continue;
                }

                if (!g_safeModeActive)
                {
                    process_slot_recovery(&g_slots[i], now);
                }

                if ((g_slots[i].state != WD_SLOT_HEALTHY) && (g_slots[i].state != WD_SLOT_COOLDOWN))
                {
                    all_healthy = false;
                }
            }

            if (all_healthy && !g_safeModeActive)
            {
                (void)xEventGroupSetBits(EventManager_GetSystemEventGroup(), EVT_BIT_WATCHDOG_OK);
                SemaphoreHandle_t pulse = EventManager_GetWatchdogPulseSemaphore();
                if (pulse != NULL)
                {
                    (void)xSemaphoreGive(pulse);
                }
            }
            else
            {
                (void)xEventGroupClearBits(EventManager_GetSystemEventGroup(), EVT_BIT_WATCHDOG_OK);
            }

            const bool escalate_safe_mode = g_safeModeRequestPending;
            char escalation_reason[96] = {0};
            if (escalate_safe_mode)
            {
                (void)snprintf(escalation_reason,
                               sizeof(escalation_reason),
                               "%s",
                               g_safeModeRequestReason);
                g_safeModeRequestPending = false;
                g_safeModeRequestReason[0] = '\0';
            }

            (void)xSemaphoreGive(g_registryMutex);

            if (escalate_safe_mode)
            {
                Watchdog_EnterSafeMode(escalation_reason);
            }
        }

        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_WATCHDOG_SCAN_MS));
    }
}

bool Watchdog_Init(void)
{
    (void)memset(g_slots, 0, sizeof(g_slots));
    (void)memset(g_history, 0, sizeof(g_history));

    g_history_head = 0U;
    g_history_count = 0U;
    g_safeModeActive = false;
    g_safeModeRequestPending = false;
    g_safeModeRequestReason[0] = '\0';

    g_qHeartbeats = xQueueCreate(LEN_Q_HEARTBEATS, sizeof(HeartbeatMessage));
    g_registryMutex = xSemaphoreCreateMutex();

    if ((g_qHeartbeats == NULL) || (g_registryMutex == NULL))
    {
        return false;
    }

    vQueueAddToRegistry(g_qHeartbeats, "qWatchdogHeartbeats");

    const BaseType_t ok = xTaskCreate(watchdog_task,
                                      "TaskWatchdog",
                                      STACK_SIZE_WATCHDOG,
                                      NULL,
                                      PRIO_WATCHDOG,
                                      &g_watchdogTask);

    return (ok == pdPASS);
}

bool Watchdog_Register(const WatchdogRegistration *registration)
{
    if ((registration == NULL) || (registration->timeout_ticks == 0U))
    {
        return false;
    }

    if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(30)) != pdTRUE)
    {
        return false;
    }

    WatchdogSlot *slot = find_slot(registration->subsystem);
    if (slot == NULL)
    {
        slot = allocate_slot(registration->subsystem);
    }

    if (slot == NULL)
    {
        (void)xSemaphoreGive(g_registryMutex);
        return false;
    }

    slot->timeout_ticks = registration->timeout_ticks;
    slot->last_heartbeat_tick = xTaskGetTickCount();
    slot->last_restart_tick = 0U;
    slot->restart_count = 0U;
    slot->restart_limit = (registration->restart_limit > 0U) ? registration->restart_limit : WD_RESTART_LIMIT_DEFAULT;
    slot->restart_cooldown_ticks = (registration->restart_cooldown_ticks > 0U)
                                        ? registration->restart_cooldown_ticks
                                        : pdMS_TO_TICKS(WD_RESTART_COOLDOWN_MS);
    slot->recovery_grace_ticks = (registration->recovery_grace_ticks > 0U)
                                     ? registration->recovery_grace_ticks
                                     : pdMS_TO_TICKS(WD_RECOVERY_GRACE_MS);
    slot->critical_for_safe_mode = registration->critical_for_safe_mode;
    slot->recovery_fn = registration->recovery_fn;
    slot->recovery_context = registration->recovery_context;
    slot->state = WD_SLOT_HEALTHY;

    Logger_Log(LOG_INFO,
               "watchdog",
               "registered subsystem=%s timeout=%lu limit=%u cooldown=%lu critical=%u",
               EventManager_SubsystemToString(registration->subsystem),
               (unsigned long)slot->timeout_ticks,
               (unsigned)slot->restart_limit,
               (unsigned long)slot->restart_cooldown_ticks,
               (unsigned)slot->critical_for_safe_mode);

    (void)xSemaphoreGive(g_registryMutex);
    return true;
}

void Watchdog_Heartbeat(SubsystemId subsystem)
{
    if (g_qHeartbeats == NULL)
    {
        return;
    }

    const HeartbeatMessage hb = {
        .subsystem = subsystem,
        .tick = xTaskGetTickCount(),
    };

    (void)xQueueSend(g_qHeartbeats, &hb, 0);
}

size_t Watchdog_GetSlotStatus(WatchdogSlotStatus *buffer, size_t capacity)
{
    if ((buffer == NULL) || (capacity == 0U))
    {
        return 0U;
    }

    if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(20)) != pdTRUE)
    {
        return 0U;
    }

    size_t copied = 0U;
    for (size_t i = 0; i < SUBSYSTEM_MAX && copied < capacity; ++i)
    {
        if (!g_slots[i].registered)
        {
            continue;
        }

        buffer[copied].subsystem = g_slots[i].subsystem;
        buffer[copied].timeout_ticks = g_slots[i].timeout_ticks;
        buffer[copied].last_heartbeat_tick = g_slots[i].last_heartbeat_tick;
        buffer[copied].last_restart_tick = g_slots[i].last_restart_tick;
        buffer[copied].restart_count = g_slots[i].restart_count;
        buffer[copied].registered = g_slots[i].registered;
        buffer[copied].critical_for_safe_mode = g_slots[i].critical_for_safe_mode;
        buffer[copied].state = g_slots[i].state;
        copied++;
    }

    (void)xSemaphoreGive(g_registryMutex);
    return copied;
}

size_t Watchdog_GetHistory(WatchdogHistoryRecord *buffer, size_t capacity)
{
    if ((buffer == NULL) || (capacity == 0U))
    {
        return 0U;
    }

    if (xSemaphoreTake(g_registryMutex, pdMS_TO_TICKS(20)) != pdTRUE)
    {
        return 0U;
    }

    const size_t to_copy = (g_history_count < capacity) ? g_history_count : capacity;
    const size_t start = (g_history_head + WD_HISTORY_DEPTH - g_history_count) % WD_HISTORY_DEPTH;

    for (size_t i = 0; i < to_copy; ++i)
    {
        const size_t idx = (start + i) % WD_HISTORY_DEPTH;
        buffer[i] = g_history[idx];
    }

    (void)xSemaphoreGive(g_registryMutex);
    return to_copy;
}
