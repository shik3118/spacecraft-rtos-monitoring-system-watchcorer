#include "emergency_tasks.h"

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "config.h"
#include "logger.h"
#include "monitoring_tasks.h"
#include "system_state.h"

typedef struct
{
    EmergencyTaskType type;
    TaskHandle_t handle;
    TickType_t last_completed_tick;
    bool triggered_state;
    float enter_threshold;
    float exit_threshold;
    const char *name;
} EmergencyController;

typedef struct
{
    EmergencyTaskType type;
    TickType_t trigger_tick;
    float metric;
    HealthLevel level;
    char reason[96];
} EmergencyTaskContext;

static SemaphoreHandle_t g_emergencyMutex = NULL;
static EmergencyController g_controllers[EMERGENCY_TASK_MAX];

static EmergencyHistoryRecord g_history[EMERGENCY_MAX_HISTORY];
static size_t g_history_head = 0U;
static size_t g_history_count = 0U;

static const char *emergency_type_to_string(EmergencyTaskType type)
{
    switch (type)
    {
        case EMERGENCY_TASK_HIGH_TEMPERATURE:
            return "high_temperature";
        case EMERGENCY_TASK_RADIATION:
            return "radiation";
        case EMERGENCY_TASK_LOW_BATTERY:
            return "low_battery";
        case EMERGENCY_TASK_MEMORY_RECOVERY:
            return "memory_recovery";
        case EMERGENCY_TASK_COMM_RECOVERY:
            return "communication_recovery";
        default:
            return "unknown";
    }
}

static void publish_emergency_event(EmergencyTaskType type, HealthLevel level, float metric, const char *detail)
{
    SystemEvent ev = {
        .tick = xTaskGetTickCount(),
        .type = (level == HEALTH_CRITICAL) ? EVENT_TYPE_FAULT : EVENT_TYPE_SAFE_MODE,
        .source = SUBSYSTEM_EMERGENCY,
        .level = level,
        .metric_value = metric,
    };

    (void)snprintf(ev.description,
                   sizeof(ev.description),
                   "emergency=%s %s",
                   emergency_type_to_string(type),
                   (detail != NULL) ? detail : "");

    (void)EventManager_PublishEvent(&ev, pdMS_TO_TICKS(10));
}

static void push_history_locked(EmergencyTaskType type,
                                EmergencyHistoryAction action,
                                HealthLevel level,
                                float metric,
                                const char *detail)
{
    EmergencyHistoryRecord *rec = &g_history[g_history_head];
    rec->tick = xTaskGetTickCount();
    rec->type = type;
    rec->action = action;
    rec->level = level;
    rec->metric_value = metric;
    (void)snprintf(rec->detail, sizeof(rec->detail), "%s", (detail != NULL) ? detail : "");

    g_history_head = (g_history_head + 1U) % EMERGENCY_MAX_HISTORY;
    if (g_history_count < EMERGENCY_MAX_HISTORY)
    {
        g_history_count++;
    }
}

static void push_history(EmergencyTaskType type,
                         EmergencyHistoryAction action,
                         HealthLevel level,
                         float metric,
                         const char *detail)
{
    if (xSemaphoreTake(g_emergencyMutex, pdMS_TO_TICKS(10)) != pdTRUE)
    {
        return;
    }

    push_history_locked(type, action, level, metric, detail);
    (void)xSemaphoreGive(g_emergencyMutex);
}

static bool parse_field_float(const char *text, const char *field_name, float *out)
{
    if ((text == NULL) || (field_name == NULL) || (out == NULL))
    {
        return false;
    }

    const char *start = strstr(text, field_name);
    if (start == NULL)
    {
        return false;
    }

    start += strlen(field_name);
    float v = 0.0f;
    if (sscanf(start, "%f", &v) == 1)
    {
        *out = v;
        return true;
    }
    return false;
}

static void release_task_context(EmergencyTaskContext *ctx)
{
    if (ctx != NULL)
    {
        vPortFree(ctx);
    }
}

static EmergencyController *controller_for_type(EmergencyTaskType type)
{
    if (type >= EMERGENCY_TASK_MAX)
    {
        return NULL;
    }
    return &g_controllers[type];
}

static void mark_task_completed(EmergencyTaskType type)
{
    if (xSemaphoreTake(g_emergencyMutex, pdMS_TO_TICKS(30)) != pdTRUE)
    {
        return;
    }

    EmergencyController *ctrl = controller_for_type(type);
    if (ctrl != NULL)
    {
        ctrl->last_completed_tick = xTaskGetTickCount();
        ctrl->handle = NULL;
    }

    (void)xSemaphoreGive(g_emergencyMutex);
}

static void cleanup_and_delete(EmergencyTaskContext *ctx, bool success, const char *detail)
{
    const EmergencyTaskType type = (ctx != NULL) ? ctx->type : EMERGENCY_TASK_HIGH_TEMPERATURE;

    push_history(type,
                 success ? EMERGENCY_HISTORY_COMPLETED : EMERGENCY_HISTORY_FAILED,
                 success ? HEALTH_WARNING : HEALTH_CRITICAL,
                 (ctx != NULL) ? ctx->metric : 0.0f,
                 detail);

    Logger_Log(success ? LOG_INFO : LOG_ERROR,
               "emergency",
               "%s completed=%u detail=%s",
               emergency_type_to_string(type),
               (unsigned)success,
               (detail != NULL) ? detail : "none");

    mark_task_completed(type);
    release_task_context(ctx);

    /* Explicit RTOS lifecycle termination. */
    vTaskDelete(NULL);
}

static void high_temperature_task(void *params)
{
    EmergencyTaskContext *ctx = (EmergencyTaskContext *)params;
    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_ERROR,
               "emergency-temp",
               "started prio=%u metric=%.2f reason=%s",
               (unsigned)PRIO_EMERGENCY_RESPONSE,
               (double)ctx->metric,
               ctx->reason);

    publish_emergency_event(EMERGENCY_TASK_HIGH_TEMPERATURE, HEALTH_CRITICAL, ctx->metric, "thermal isolation sequence start");
    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_SENSOR_HEALTH, false);

    for (uint8_t step = 0U; step < 4U; ++step)
    {
        publish_emergency_event(EMERGENCY_TASK_HIGH_TEMPERATURE,
                                HEALTH_WARNING,
                                ctx->metric,
                                "executing thermal mitigation step");
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_EMERGENCY_STEP_MS));
    }

    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_SENSOR_HEALTH, true);
    (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED, "high temperature handled", SUBSYSTEM_EMERGENCY);

    cleanup_and_delete(ctx, true, "thermal mitigation complete");
}

static void radiation_emergency_task(void *params)
{
    EmergencyTaskContext *ctx = (EmergencyTaskContext *)params;
    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_ERROR,
               "emergency-rad",
               "started prio=%u metric=%.2f",
               (unsigned)PRIO_EMERGENCY_RESPONSE,
               (double)ctx->metric);

    publish_emergency_event(EMERGENCY_TASK_RADIATION, HEALTH_CRITICAL, ctx->metric, "radiation mode entered");
    (void)SystemState_TransitionTo(SYSTEM_MODE_SAFE, "radiation event isolation", SUBSYSTEM_EMERGENCY);
    MonitoringTasks_EnterSafeMode();

    for (uint8_t step = 0U; step < 5U; ++step)
    {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_EMERGENCY_STEP_MS));
        publish_emergency_event(EMERGENCY_TASK_RADIATION,
                                HEALTH_WARNING,
                                ctx->metric,
                                "radiation scrub and watchdog validation");
    }

    MonitoringTasks_ExitSafeMode();
    (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED, "radiation mitigation complete", SUBSYSTEM_EMERGENCY);

    cleanup_and_delete(ctx, true, "radiation recovery completed");
}

static void low_battery_recovery_task(void *params)
{
    EmergencyTaskContext *ctx = (EmergencyTaskContext *)params;
    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_WARN,
               "emergency-batt",
               "started prio=%u metric=%.2f",
               (unsigned)PRIO_EMERGENCY_RESPONSE,
               (double)ctx->metric);

    publish_emergency_event(EMERGENCY_TASK_LOW_BATTERY, HEALTH_CRITICAL, ctx->metric, "load shedding initiated");
    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_COMMUNICATION, false);

    for (uint8_t step = 0U; step < 3U; ++step)
    {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_EMERGENCY_STEP_MS));
        publish_emergency_event(EMERGENCY_TASK_LOW_BATTERY,
                                HEALTH_WARNING,
                                ctx->metric,
                                "battery recovery in progress");
    }

    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_COMMUNICATION, true);
    (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED, "battery stabilized", SUBSYSTEM_EMERGENCY);

    cleanup_and_delete(ctx, true, "low battery recovery complete");
}

static void memory_recovery_task(void *params)
{
    EmergencyTaskContext *ctx = (EmergencyTaskContext *)params;
    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_ERROR,
               "emergency-mem",
               "started prio=%u heap_metric=%.2f",
               (unsigned)PRIO_EMERGENCY_RESPONSE,
               (double)ctx->metric);

    publish_emergency_event(EMERGENCY_TASK_MEMORY_RECOVERY, HEALTH_CRITICAL, ctx->metric, "memory recovery initiated");
    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_SENSOR_HEALTH, false);

    for (uint8_t step = 0U; step < 4U; ++step)
    {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_EMERGENCY_STEP_MS));
        publish_emergency_event(EMERGENCY_TASK_MEMORY_RECOVERY,
                                HEALTH_WARNING,
                                ctx->metric,
                                "memory compaction / queue drainage step");
    }

    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_SENSOR_HEALTH, true);
    (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED, "memory pressure relieved", SUBSYSTEM_EMERGENCY);

    cleanup_and_delete(ctx, true, "memory recovery completed");
}

static void communication_recovery_task(void *params)
{
    EmergencyTaskContext *ctx = (EmergencyTaskContext *)params;
    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_WARN,
               "emergency-comms",
               "started prio=%u metric=%.2f",
               (unsigned)PRIO_EMERGENCY_RESPONSE,
               (double)ctx->metric);

    publish_emergency_event(EMERGENCY_TASK_COMM_RECOVERY, HEALTH_CRITICAL, ctx->metric, "communication recovery initiated");
    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_COMMUNICATION, false);

    for (uint8_t step = 0U; step < 4U; ++step)
    {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_EMERGENCY_STEP_MS));
        publish_emergency_event(EMERGENCY_TASK_COMM_RECOVERY,
                                HEALTH_WARNING,
                                ctx->metric,
                                "link re-acquisition step");
    }

    MonitoringTasks_SetSubsystemEnabled(SUBSYSTEM_COMMUNICATION, true);
    (void)SystemState_TransitionTo(SYSTEM_MODE_DEGRADED, "communication restored", SUBSYSTEM_EMERGENCY);

    cleanup_and_delete(ctx, true, "communication recovery complete");
}

static TaskFunction_t get_task_function(EmergencyTaskType type)
{
    switch (type)
    {
        case EMERGENCY_TASK_HIGH_TEMPERATURE:
            return high_temperature_task;
        case EMERGENCY_TASK_RADIATION:
            return radiation_emergency_task;
        case EMERGENCY_TASK_LOW_BATTERY:
            return low_battery_recovery_task;
        case EMERGENCY_TASK_MEMORY_RECOVERY:
            return memory_recovery_task;
        case EMERGENCY_TASK_COMM_RECOVERY:
            return communication_recovery_task;
        default:
            return NULL;
    }
}

static const char *get_task_name(EmergencyTaskType type)
{
    switch (type)
    {
        case EMERGENCY_TASK_HIGH_TEMPERATURE:
            return "TaskEmergTemp";
        case EMERGENCY_TASK_RADIATION:
            return "TaskEmergRad";
        case EMERGENCY_TASK_LOW_BATTERY:
            return "TaskEmergBatt";
        case EMERGENCY_TASK_MEMORY_RECOVERY:
            return "TaskEmergMem";
        case EMERGENCY_TASK_COMM_RECOVERY:
            return "TaskEmergComm";
        default:
            return "TaskEmergUnknown";
    }
}

/* MUST be called with g_emergencyMutex already held. */
static bool spawn_emergency_task_locked(EmergencyTaskType type, const SystemEvent *trigger)
{
    EmergencyController *ctrl = controller_for_type(type);
    if ((ctrl == NULL) || (trigger == NULL))
    {
        return false;
    }

    if (ctrl->handle != NULL)
    {
        push_history_locked(type, EMERGENCY_HISTORY_HYSTERESIS_BLOCK, trigger->level, trigger->metric_value, "already active");
        return false;
    }

    const TickType_t now = xTaskGetTickCount();
    if ((now - ctrl->last_completed_tick) < pdMS_TO_TICKS(EMERGENCY_TASK_COOLDOWN_MS))
    {
        push_history_locked(type, EMERGENCY_HISTORY_COOLDOWN_REJECT, trigger->level, trigger->metric_value, "cooldown active");
        return false;
    }

    EmergencyTaskContext *ctx = pvPortMalloc(sizeof(EmergencyTaskContext));
    if (ctx == NULL)
    {
        push_history_locked(type, EMERGENCY_HISTORY_FAILED, trigger->level, trigger->metric_value, "context alloc failed");
        return false;
    }

    ctx->type = type;
    ctx->trigger_tick = now;
    ctx->metric = trigger->metric_value;
    ctx->level = trigger->level;
    (void)snprintf(ctx->reason,
                   sizeof(ctx->reason),
                   "src=%s type=%s desc=%s",
                   EventManager_SubsystemToString(trigger->source),
                   EventManager_EventTypeToString(trigger->type),
                   trigger->description);

    const TaskFunction_t task_fn = get_task_function(type);
    const BaseType_t rc = xTaskCreate(task_fn,
                                      get_task_name(type),
                                      STACK_SIZE_EMERGENCY,
                                      ctx,
                                      PRIO_EMERGENCY_RESPONSE,
                                      &ctrl->handle);
    if (rc != pdPASS)
    {
        release_task_context(ctx);
        ctrl->handle = NULL;
        push_history_locked(type, EMERGENCY_HISTORY_FAILED, trigger->level, trigger->metric_value, "xTaskCreate failed");
        return false;
    }

    push_history_locked(type, EMERGENCY_HISTORY_CREATED, trigger->level, trigger->metric_value, ctx->reason);
    Logger_Log(LOG_ERROR,
               "emergency",
               "spawned task=%s prio=%u metric=%.2f",
               ctrl->name,
               (unsigned)PRIO_EMERGENCY_RESPONSE,
               (double)trigger->metric_value);

    return true;
}

static bool exit_trigger(EmergencyController *ctrl, float value)
{
    return (value <= ctrl->exit_threshold);
}

static bool should_trigger(EmergencyTaskType type, const SystemEvent *ev, float parsed_metric)
{
    const float metric = (parsed_metric >= 0.0f) ? parsed_metric : ev->metric_value;

    switch (type)
    {
        case EMERGENCY_TASK_HIGH_TEMPERATURE:
            return (ev->source == SUBSYSTEM_SENSOR_HEALTH) && (ev->level >= HEALTH_WARNING) && (metric >= TEMP_TRIGGER_ENTER);

        case EMERGENCY_TASK_RADIATION:
            return (ev->source == SUBSYSTEM_SENSOR_HEALTH || ev->source == SUBSYSTEM_CPU) &&
                   (ev->type == EVENT_TYPE_FAULT) &&
                   (metric >= RAD_TRIGGER_ENTER);

        case EMERGENCY_TASK_LOW_BATTERY:
            return (ev->source == SUBSYSTEM_SENSOR_HEALTH) &&
                   (parsed_metric >= 0.0f) &&
                   (parsed_metric <= LOW_BATTERY_ENTER);

        case EMERGENCY_TASK_MEMORY_RECOVERY:
            return (ev->source == SUBSYSTEM_HEAP_STACK) && (ev->metric_value <= (float)MEMORY_PRESSURE_ENTER);

        case EMERGENCY_TASK_COMM_RECOVERY:
            return (ev->source == SUBSYSTEM_COMMUNICATION) && (ev->level >= HEALTH_WARNING) && (metric >= COMM_FAILURE_ENTER);

        default:
            return false;
    }
}

void EmergencyTasks_HandleEvent(const SystemEvent *event)
{
    if ((event == NULL) || (g_emergencyMutex == NULL))
    {
        return;
    }

    /* Ignore self-generated emergency events to avoid recursive spawning. */
    if (event->source == SUBSYSTEM_EMERGENCY)
    {
        return;
    }

    if (xSemaphoreTake(g_emergencyMutex, pdMS_TO_TICKS(5)) != pdTRUE)
    {
        return;
    }

    float temperature_value = -1.0f;
    float vbus_value = -1.0f;
    (void)parse_field_float(event->description, "therm=", &temperature_value);
    (void)parse_field_float(event->description, "vbus=", &vbus_value);

    for (size_t i = 0; i < EMERGENCY_TASK_MAX; ++i)
    {
        EmergencyController *ctrl = &g_controllers[i];

        float metric_probe = event->metric_value;
        if (ctrl->type == EMERGENCY_TASK_HIGH_TEMPERATURE && (temperature_value >= 0.0f))
        {
            metric_probe = temperature_value;
        }
        else if (ctrl->type == EMERGENCY_TASK_LOW_BATTERY && (vbus_value >= 0.0f))
        {
            metric_probe = vbus_value;
        }

        if (!ctrl->triggered_state)
        {
            if (should_trigger(ctrl->type, event, (ctrl->type == EMERGENCY_TASK_LOW_BATTERY) ? vbus_value : metric_probe))
            {
                ctrl->triggered_state = true;
                (void)spawn_emergency_task_locked(ctrl->type, event);
            }
        }
        else if (exit_trigger(ctrl, metric_probe))
        {
            ctrl->triggered_state = false;
            push_history_locked(ctrl->type,
                                EMERGENCY_HISTORY_HYSTERESIS_BLOCK,
                                event->level,
                                metric_probe,
                                "hysteresis released");
        }
    }

    (void)xSemaphoreGive(g_emergencyMutex);
}

bool EmergencyTasks_Init(void)
{
    g_emergencyMutex = xSemaphoreCreateMutex();
    if (g_emergencyMutex == NULL)
    {
        return false;
    }

    (void)memset(g_controllers, 0, sizeof(g_controllers));
    (void)memset(g_history, 0, sizeof(g_history));
    g_history_head = 0U;
    g_history_count = 0U;

    g_controllers[EMERGENCY_TASK_HIGH_TEMPERATURE] = (EmergencyController){
        .type = EMERGENCY_TASK_HIGH_TEMPERATURE,
        .handle = NULL,
        .last_completed_tick = 0,
        .triggered_state = false,
        .enter_threshold = TEMP_TRIGGER_ENTER,
        .exit_threshold = TEMP_TRIGGER_EXIT,
        .name = "HighTemperatureTask",
    };

    g_controllers[EMERGENCY_TASK_RADIATION] = (EmergencyController){
        .type = EMERGENCY_TASK_RADIATION,
        .handle = NULL,
        .last_completed_tick = 0,
        .triggered_state = false,
        .enter_threshold = RAD_TRIGGER_ENTER,
        .exit_threshold = RAD_TRIGGER_EXIT,
        .name = "RadiationEmergencyTask",
    };

    g_controllers[EMERGENCY_TASK_LOW_BATTERY] = (EmergencyController){
        .type = EMERGENCY_TASK_LOW_BATTERY,
        .handle = NULL,
        .last_completed_tick = 0,
        .triggered_state = false,
        .enter_threshold = LOW_BATTERY_ENTER,
        .exit_threshold = LOW_BATTERY_EXIT,
        .name = "LowBatteryRecoveryTask",
    };

    g_controllers[EMERGENCY_TASK_MEMORY_RECOVERY] = (EmergencyController){
        .type = EMERGENCY_TASK_MEMORY_RECOVERY,
        .handle = NULL,
        .last_completed_tick = 0,
        .triggered_state = false,
        .enter_threshold = (float)MEMORY_PRESSURE_ENTER,
        .exit_threshold = (float)MEMORY_PRESSURE_EXIT,
        .name = "MemoryRecoveryTask",
    };

    g_controllers[EMERGENCY_TASK_COMM_RECOVERY] = (EmergencyController){
        .type = EMERGENCY_TASK_COMM_RECOVERY,
        .handle = NULL,
        .last_completed_tick = 0,
        .triggered_state = false,
        .enter_threshold = COMM_FAILURE_ENTER,
        .exit_threshold = COMM_FAILURE_EXIT,
        .name = "CommunicationRecoveryTask",
    };

    Logger_Log(LOG_INFO,
               "emergency",
               "dynamic emergency manager initialized (no permanent emergency task)");

    return true;
}

size_t EmergencyTasks_GetHistory(EmergencyHistoryRecord *buffer, size_t capacity)
{
    if ((buffer == NULL) || (capacity == 0U) || (g_emergencyMutex == NULL))
    {
        return 0U;
    }

    if (xSemaphoreTake(g_emergencyMutex, pdMS_TO_TICKS(20)) != pdTRUE)
    {
        return 0U;
    }

    const size_t to_copy = (g_history_count < capacity) ? g_history_count : capacity;
    size_t start = (g_history_head + EMERGENCY_MAX_HISTORY - g_history_count) % EMERGENCY_MAX_HISTORY;

    for (size_t i = 0; i < to_copy; ++i)
    {
        const size_t idx = (start + i) % EMERGENCY_MAX_HISTORY;
        buffer[i] = g_history[idx];
    }

    (void)xSemaphoreGive(g_emergencyMutex);
    return to_copy;
}
