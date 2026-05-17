#include "monitoring_tasks.h"

#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "config.h"
#include "logger.h"
#include "watchdog.h"

typedef enum
{
    MONITOR_SAMPLE_CPU = 0,
    MONITOR_SAMPLE_HEAP_STACK,
    MONITOR_SAMPLE_SENSOR_HEALTH
} MonitorSampleType;

typedef struct
{
    TickType_t tick;
    MonitorSampleType type;
    SubsystemId source;
    HealthLevel level;
    float primary_value;
    float secondary_value;
    char note[80];
} MonitorSampleMessage;

typedef struct
{
    TaskHandle_t cpu_task;
    TaskHandle_t heap_stack_task;
    TaskHandle_t sensor_health_task;
    TaskHandle_t communication_task;

    HealthLevel cpu_level;
    HealthLevel heap_level;
    HealthLevel stack_level;
    HealthLevel sensor_level;
    HealthLevel communication_level;

    uint32_t rng_state;
} MonitorRuntimeState;

static QueueHandle_t g_monitorSampleQueue = NULL;
static SemaphoreHandle_t g_monitorMutex = NULL;
static MonitorRuntimeState g_runtime;

static float rng_unit(uint32_t *state)
{
    *state = (1664525U * (*state)) + 1013904223U;
    const uint32_t raw = (*state >> 8) & 0x00FFFFFFUL;
    return (float)raw / 16777215.0f;
}

/* Hysteresis for metrics where high values are bad (e.g., CPU, link saturation). */
static HealthLevel evaluate_high_threshold_hysteresis(HealthLevel current,
                                                      float value,
                                                      float warn_high,
                                                      float warn_low,
                                                      float crit_high,
                                                      float crit_low)
{
    if (current == HEALTH_CRITICAL)
    {
        return (value <= crit_low) ? HEALTH_WARNING : HEALTH_CRITICAL;
    }

    if (current == HEALTH_WARNING)
    {
        if (value >= crit_high)
        {
            return HEALTH_CRITICAL;
        }
        return (value <= warn_low) ? HEALTH_NOMINAL : HEALTH_WARNING;
    }

    if (value >= crit_high)
    {
        return HEALTH_CRITICAL;
    }

    return (value >= warn_high) ? HEALTH_WARNING : HEALTH_NOMINAL;
}

/* Hysteresis for metrics where low values are bad (e.g., free heap, stack watermark). */
static HealthLevel evaluate_low_threshold_hysteresis(HealthLevel current,
                                                     float value,
                                                     float warn_low,
                                                     float warn_high,
                                                     float crit_low,
                                                     float crit_high)
{
    if (current == HEALTH_CRITICAL)
    {
        return (value >= crit_high) ? HEALTH_WARNING : HEALTH_CRITICAL;
    }

    if (current == HEALTH_WARNING)
    {
        if (value <= crit_low)
        {
            return HEALTH_CRITICAL;
        }
        return (value >= warn_high) ? HEALTH_NOMINAL : HEALTH_WARNING;
    }

    if (value <= crit_low)
    {
        return HEALTH_CRITICAL;
    }

    return (value <= warn_low) ? HEALTH_WARNING : HEALTH_NOMINAL;
}

static void publish_direct_event(SubsystemId source, HealthLevel level, EventType type, float metric, const char *note)
{
    SystemEvent event = {
        .tick = xTaskGetTickCount(),
        .type = type,
        .source = source,
        .level = level,
        .metric_value = metric,
    };

    (void)snprintf(event.description, sizeof(event.description), "%s", (note != NULL) ? note : "");
    (void)EventManager_PublishEvent(&event, pdMS_TO_TICKS(5));
}

static void enqueue_monitor_sample(const MonitorSampleMessage *sample)
{
    if (sample == NULL)
    {
        return;
    }

    if (xQueueSend(g_monitorSampleQueue, sample, 0) != pdPASS)
    {
        Logger_Log(LOG_WARN, "monitor", "sample queue overflow type=%u", (unsigned)sample->type);
        publish_direct_event(sample->source,
                             HEALTH_WARNING,
                             EVENT_TYPE_DIAGNOSTIC,
                             (float)uxQueueMessagesWaiting(g_monitorSampleQueue),
                             "monitor sample queue overflow");
    }
}

static void cpu_monitor_task(void *params)
{
    (void)params;

    const WatchdogRegistration reg = {
        .subsystem = SUBSYSTEM_CPU,
        .timeout_ticks = pdMS_TO_TICKS(WD_TIMEOUT_CPU_MS),
        .restart_limit = WD_RESTART_LIMIT_DEFAULT,
        .restart_cooldown_ticks = pdMS_TO_TICKS(WD_RESTART_COOLDOWN_MS),
        .recovery_grace_ticks = pdMS_TO_TICKS(WD_RECOVERY_GRACE_MS),
        .critical_for_safe_mode = true,
    };
    (void)Watchdog_Register(&reg);

    TickType_t last_wake = xTaskGetTickCount();
    uint16_t report_divider = 0;

    Logger_Log(LOG_INFO,
               "mon-cpu",
               "start prio=%u period_ms=%u",
               (unsigned)PRIO_MONITOR,
               (unsigned)PERIOD_CPU_MONITOR_MS);

    for (;;)
    {
        const UBaseType_t telemetry_depth = uxQueueMessagesWaiting(EventManager_GetTelemetryQueue());
        const UBaseType_t emergency_depth = uxQueueMessagesWaiting(EventManager_GetEmergencyQueue());

        /* Low-cost synthetic CPU estimate for Linux simulation. */
        const float jitter = (rng_unit(&g_runtime.rng_state) - 0.5f) * 14.0f;
        float estimated_cpu = 42.0f + jitter + ((float)(telemetry_depth + emergency_depth) * 1.1f);
        if (estimated_cpu < 0.0f)
        {
            estimated_cpu = 0.0f;
        }
        if (estimated_cpu > 100.0f)
        {
            estimated_cpu = 100.0f;
        }

        if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(3)) == pdTRUE)
        {
            g_runtime.cpu_level = evaluate_high_threshold_hysteresis(g_runtime.cpu_level,
                                                                     estimated_cpu,
                                                                     CPU_WARN_HIGH_PERCENT,
                                                                     CPU_WARN_LOW_PERCENT,
                                                                     CPU_CRIT_HIGH_PERCENT,
                                                                     CPU_CRIT_LOW_PERCENT);
            (void)xSemaphoreGive(g_monitorMutex);
        }

        const MonitorSampleMessage sample = {
            .tick = xTaskGetTickCount(),
            .type = MONITOR_SAMPLE_CPU,
            .source = SUBSYSTEM_CPU,
            .level = g_runtime.cpu_level,
            .primary_value = estimated_cpu,
            .secondary_value = (float)telemetry_depth,
        };

        MonitorSampleMessage mutable_sample = sample;
        (void)snprintf(mutable_sample.note,
                       sizeof(mutable_sample.note),
                       "cpu=%.2f qtele=%lu qemg=%lu",
                       (double)estimated_cpu,
                       (unsigned long)telemetry_depth,
                       (unsigned long)emergency_depth);
        enqueue_monitor_sample(&mutable_sample);

        if ((mutable_sample.level != HEALTH_NOMINAL) || ((report_divider % 20U) == 0U))
        {
            Logger_Log((mutable_sample.level == HEALTH_CRITICAL) ? LOG_ERROR : LOG_INFO,
                       "mon-cpu",
                       "cpu=%.2f%% level=%s",
                       (double)estimated_cpu,
                       EventManager_HealthToString(mutable_sample.level));
        }

        Watchdog_Heartbeat(SUBSYSTEM_CPU);
        report_divider++;
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_CPU_MONITOR_MS));
    }
}

static void heap_stack_monitor_task(void *params)
{
    (void)params;

    const WatchdogRegistration reg = {
        .subsystem = SUBSYSTEM_HEAP_STACK,
        .timeout_ticks = pdMS_TO_TICKS(WD_TIMEOUT_HEAP_STACK_MS),
        .restart_limit = WD_RESTART_LIMIT_DEFAULT,
        .restart_cooldown_ticks = pdMS_TO_TICKS(WD_RESTART_COOLDOWN_MS),
        .recovery_grace_ticks = pdMS_TO_TICKS(WD_RECOVERY_GRACE_MS),
        .critical_for_safe_mode = true,
    };
    (void)Watchdog_Register(&reg);

    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_INFO,
               "mon-mem",
               "start prio=%u period_ms=%u",
               (unsigned)PRIO_MONITOR,
               (unsigned)PERIOD_HEAP_STACK_MONITOR_MS);

    for (;;)
    {
        const size_t free_heap = xPortGetFreeHeapSize();
        const size_t min_ever_heap = xPortGetMinimumEverFreeHeapSize();

        UBaseType_t min_stack_words = (UBaseType_t)-1;
        const TaskHandle_t handles[] = {
            g_runtime.cpu_task,
            g_runtime.heap_stack_task,
            g_runtime.sensor_health_task,
            g_runtime.communication_task,
        };

        for (size_t i = 0; i < (sizeof(handles) / sizeof(handles[0])); ++i)
        {
            if (handles[i] != NULL)
            {
                const UBaseType_t watermark = uxTaskGetStackHighWaterMark(handles[i]);
                if (watermark < min_stack_words)
                {
                    min_stack_words = watermark;
                }
            }
        }

        if (min_stack_words == (UBaseType_t)-1)
        {
            min_stack_words = 0U;
        }

        if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(3)) == pdTRUE)
        {
            g_runtime.heap_level = evaluate_low_threshold_hysteresis(g_runtime.heap_level,
                                                                     (float)free_heap,
                                                                     (float)HEAP_WARN_LOW_BYTES,
                                                                     (float)(HEAP_WARN_LOW_BYTES + 4096U),
                                                                     (float)HEAP_CRIT_LOW_BYTES,
                                                                     (float)(HEAP_CRIT_LOW_BYTES + 4096U));

            g_runtime.stack_level = evaluate_low_threshold_hysteresis(g_runtime.stack_level,
                                                                      (float)min_stack_words,
                                                                      (float)STACK_WARN_LOW_WORDS,
                                                                      (float)(STACK_WARN_LOW_WORDS + 20U),
                                                                      (float)STACK_CRIT_LOW_WORDS,
                                                                      (float)(STACK_CRIT_LOW_WORDS + 20U));
            (void)xSemaphoreGive(g_monitorMutex);
        }

        HealthLevel aggregate = g_runtime.heap_level;
        if (g_runtime.stack_level > aggregate)
        {
            aggregate = g_runtime.stack_level;
        }

        MonitorSampleMessage sample = {
            .tick = xTaskGetTickCount(),
            .type = MONITOR_SAMPLE_HEAP_STACK,
            .source = SUBSYSTEM_HEAP_STACK,
            .level = aggregate,
            .primary_value = (float)free_heap,
            .secondary_value = (float)min_stack_words,
        };

        (void)snprintf(sample.note,
                       sizeof(sample.note),
                       "heap=%lu min_heap=%lu stack_hw=%lu",
                       (unsigned long)free_heap,
                       (unsigned long)min_ever_heap,
                       (unsigned long)min_stack_words);

        enqueue_monitor_sample(&sample);

        if (aggregate != HEALTH_NOMINAL)
        {
            Logger_Log((aggregate == HEALTH_CRITICAL) ? LOG_ERROR : LOG_WARN,
                       "mon-mem",
                       "heap=%lu stack_hw=%lu level=%s",
                       (unsigned long)free_heap,
                       (unsigned long)min_stack_words,
                       EventManager_HealthToString(aggregate));
        }

        Watchdog_Heartbeat(SUBSYSTEM_HEAP_STACK);
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_HEAP_STACK_MONITOR_MS));
    }
}

static void sensor_health_task(void *params)
{
    (void)params;

    const WatchdogRegistration reg = {
        .subsystem = SUBSYSTEM_SENSOR_HEALTH,
        .timeout_ticks = pdMS_TO_TICKS(WD_TIMEOUT_SENSOR_HEALTH_MS),
        .restart_limit = WD_RESTART_LIMIT_DEFAULT,
        .restart_cooldown_ticks = pdMS_TO_TICKS(WD_RESTART_COOLDOWN_MS),
        .recovery_grace_ticks = pdMS_TO_TICKS(WD_RECOVERY_GRACE_MS),
        .critical_for_safe_mode = false,
    };
    (void)Watchdog_Register(&reg);

    TickType_t last_wake = xTaskGetTickCount();
    uint16_t report_divider = 0;

    Logger_Log(LOG_INFO,
               "mon-sensor",
               "start prio=%u period_ms=%u",
               (unsigned)PRIO_MONITOR,
               (unsigned)PERIOD_SENSOR_HEALTH_MONITOR_MS);

    for (;;)
    {
        float gyro_score = 72.0f + (rng_unit(&g_runtime.rng_state) * 18.0f);
        float thermal_score = 70.0f + (rng_unit(&g_runtime.rng_state) * 20.0f);
        float voltage_score = 71.0f + (rng_unit(&g_runtime.rng_state) * 19.0f);

        const float weighted_score = (gyro_score * 0.4f) + (thermal_score * 0.3f) + (voltage_score * 0.3f);

        if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(3)) == pdTRUE)
        {
            g_runtime.sensor_level = evaluate_high_threshold_hysteresis(g_runtime.sensor_level,
                                                                        weighted_score,
                                                                        SENSOR_WARN_HIGH_SCORE,
                                                                        SENSOR_WARN_LOW_SCORE,
                                                                        SENSOR_CRIT_HIGH_SCORE,
                                                                        SENSOR_CRIT_LOW_SCORE);
            (void)xSemaphoreGive(g_monitorMutex);
        }

        MonitorSampleMessage sample = {
            .tick = xTaskGetTickCount(),
            .type = MONITOR_SAMPLE_SENSOR_HEALTH,
            .source = SUBSYSTEM_SENSOR_HEALTH,
            .level = g_runtime.sensor_level,
            .primary_value = weighted_score,
            .secondary_value = gyro_score,
        };

        (void)snprintf(sample.note,
                       sizeof(sample.note),
                       "score=%.2f gyro=%.2f therm=%.2f vbus=%.2f",
                       (double)weighted_score,
                       (double)gyro_score,
                       (double)thermal_score,
                       (double)voltage_score);

        enqueue_monitor_sample(&sample);

        if ((sample.level != HEALTH_NOMINAL) || ((report_divider % 15U) == 0U))
        {
            Logger_Log((sample.level == HEALTH_CRITICAL) ? LOG_ERROR : LOG_INFO,
                       "mon-sensor",
                       "sensor_score=%.2f level=%s",
                       (double)weighted_score,
                       EventManager_HealthToString(sample.level));
        }

        Watchdog_Heartbeat(SUBSYSTEM_SENSOR_HEALTH);
        report_divider++;
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_SENSOR_HEALTH_MONITOR_MS));
    }
}

static void publish_sample_as_telemetry(const MonitorSampleMessage *sample)
{
    if (sample == NULL)
    {
        return;
    }

    SystemEvent event = {
        .tick = sample->tick,
        .type = (sample->level == HEALTH_CRITICAL) ? EVENT_TYPE_FAULT : EVENT_TYPE_HEALTH,
        .source = sample->source,
        .level = sample->level,
        .metric_value = sample->primary_value,
    };

    (void)snprintf(event.description,
                   sizeof(event.description),
                   "sample=%u p=%.2f s=%.2f %s",
                   (unsigned)sample->type,
                   (double)sample->primary_value,
                   (double)sample->secondary_value,
                   sample->note);

    (void)EventManager_PublishEvent(&event, pdMS_TO_TICKS(10));
}

static void communication_monitor_task(void *params)
{
    (void)params;

    const WatchdogRegistration reg = {
        .subsystem = SUBSYSTEM_COMMUNICATION,
        .timeout_ticks = pdMS_TO_TICKS(WD_TIMEOUT_COMMUNICATION_MS),
        .restart_limit = WD_RESTART_LIMIT_DEFAULT,
        .restart_cooldown_ticks = pdMS_TO_TICKS(WD_RESTART_COOLDOWN_MS),
        .recovery_grace_ticks = pdMS_TO_TICKS(WD_RECOVERY_GRACE_MS),
        .critical_for_safe_mode = false,
    };
    (void)Watchdog_Register(&reg);

    TickType_t last_wake = xTaskGetTickCount();

    Logger_Log(LOG_INFO,
               "mon-comm",
               "start prio=%u period_ms=%u sample_queue=%u",
               (unsigned)PRIO_MONITOR_COMMUNICATION,
               (unsigned)PERIOD_COMMUNICATION_MONITOR_MS,
               (unsigned)LEN_Q_MONITOR_SAMPLES);

    for (;;)
    {
        /* Queue communication path: drain bounded number per period to keep runtime deterministic. */
        for (uint8_t drained = 0; drained < 8U; ++drained)
        {
            MonitorSampleMessage sample;
            if (xQueueReceive(g_monitorSampleQueue, &sample, 0) != pdTRUE)
            {
                break;
            }
            publish_sample_as_telemetry(&sample);
        }

        const float link_use = 55.0f + ((rng_unit(&g_runtime.rng_state) - 0.5f) * 20.0f);

        if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(3)) == pdTRUE)
        {
            g_runtime.communication_level = evaluate_high_threshold_hysteresis(g_runtime.communication_level,
                                                                               link_use,
                                                                               COMM_WARN_HIGH_PERCENT,
                                                                               COMM_WARN_LOW_PERCENT,
                                                                               COMM_CRIT_HIGH_PERCENT,
                                                                               COMM_CRIT_LOW_PERCENT);
            (void)xSemaphoreGive(g_monitorMutex);
        }

        const UBaseType_t queue_depth = uxQueueMessagesWaiting(g_monitorSampleQueue);

        SystemEvent comm_event = {
            .tick = xTaskGetTickCount(),
            .type = EVENT_TYPE_DIAGNOSTIC,
            .source = SUBSYSTEM_COMMUNICATION,
            .level = g_runtime.communication_level,
            .metric_value = link_use,
        };

        (void)snprintf(comm_event.description,
                       sizeof(comm_event.description),
                       "link=%.2f q_mon=%lu",
                       (double)link_use,
                       (unsigned long)queue_depth);
        (void)EventManager_PublishEvent(&comm_event, pdMS_TO_TICKS(10));

        if (g_runtime.communication_level != HEALTH_NOMINAL)
        {
            Logger_Log((g_runtime.communication_level == HEALTH_CRITICAL) ? LOG_ERROR : LOG_WARN,
                       "mon-comm",
                       "communication level=%s link=%.2f qdepth=%lu",
                       EventManager_HealthToString(g_runtime.communication_level),
                       (double)link_use,
                       (unsigned long)queue_depth);
        }

        Watchdog_Heartbeat(SUBSYSTEM_COMMUNICATION);
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(PERIOD_COMMUNICATION_MONITOR_MS));
    }
}

static bool create_task_for_subsystem(SubsystemId subsystem)
{
    BaseType_t result = pdFAIL;

    switch (subsystem)
    {
        case SUBSYSTEM_CPU:
            if (g_runtime.cpu_task == NULL)
            {
                result = xTaskCreate(cpu_monitor_task,
                                     "TaskMonCPU",
                                     STACK_SIZE_MONITOR,
                                     NULL,
                                     PRIO_MONITOR,
                                     &g_runtime.cpu_task);
            }
            break;

        case SUBSYSTEM_HEAP_STACK:
            if (g_runtime.heap_stack_task == NULL)
            {
                result = xTaskCreate(heap_stack_monitor_task,
                                     "TaskMonHeapStack",
                                     STACK_SIZE_MONITOR,
                                     NULL,
                                     PRIO_MONITOR,
                                     &g_runtime.heap_stack_task);
            }
            break;

        case SUBSYSTEM_SENSOR_HEALTH:
            if (g_runtime.sensor_health_task == NULL)
            {
                result = xTaskCreate(sensor_health_task,
                                     "TaskMonSensor",
                                     STACK_SIZE_MONITOR,
                                     NULL,
                                     PRIO_MONITOR,
                                     &g_runtime.sensor_health_task);
            }
            break;

        case SUBSYSTEM_COMMUNICATION:
            if (g_runtime.communication_task == NULL)
            {
                result = xTaskCreate(communication_monitor_task,
                                     "TaskMonComm",
                                     STACK_SIZE_MONITOR,
                                     NULL,
                                     PRIO_MONITOR_COMMUNICATION,
                                     &g_runtime.communication_task);
            }
            break;

        default:
            break;
    }

    return (result == pdPASS);
}

static bool delete_task_for_subsystem(SubsystemId subsystem)
{
    TaskHandle_t *target = NULL;

    switch (subsystem)
    {
        case SUBSYSTEM_CPU:
            target = &g_runtime.cpu_task;
            break;
        case SUBSYSTEM_HEAP_STACK:
            target = &g_runtime.heap_stack_task;
            break;
        case SUBSYSTEM_SENSOR_HEALTH:
            target = &g_runtime.sensor_health_task;
            break;
        case SUBSYSTEM_COMMUNICATION:
            target = &g_runtime.communication_task;
            break;
        default:
            return false;
    }

    if (*target == NULL)
    {
        return true;
    }

    TaskHandle_t handle = *target;
    *target = NULL;
    vTaskDelete(handle);
    return true;
}

bool MonitoringTasks_Init(void)
{
    (void)memset(&g_runtime, 0, sizeof(g_runtime));
    g_runtime.rng_state = 0x33CCAA55UL;

    g_monitorSampleQueue = xQueueCreate(LEN_Q_MONITOR_SAMPLES, sizeof(MonitorSampleMessage));
    g_monitorMutex = xSemaphoreCreateMutex();

    if ((g_monitorSampleQueue == NULL) || (g_monitorMutex == NULL))
    {
        return false;
    }

    vQueueAddToRegistry(g_monitorSampleQueue, "qMonitorSamples");

    g_runtime.cpu_level = HEALTH_NOMINAL;
    g_runtime.heap_level = HEALTH_NOMINAL;
    g_runtime.stack_level = HEALTH_NOMINAL;
    g_runtime.sensor_level = HEALTH_NOMINAL;
    g_runtime.communication_level = HEALTH_NOMINAL;

    return true;
}

bool MonitoringTasks_StartAll(void)
{
    if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(50)) != pdTRUE)
    {
        return false;
    }

    bool ok = true;
    ok &= create_task_for_subsystem(SUBSYSTEM_CPU);
    ok &= create_task_for_subsystem(SUBSYSTEM_HEAP_STACK);
    ok &= create_task_for_subsystem(SUBSYSTEM_SENSOR_HEALTH);
    ok &= create_task_for_subsystem(SUBSYSTEM_COMMUNICATION);

    (void)xSemaphoreGive(g_monitorMutex);

    Logger_Log(LOG_INFO,
               "monitor",
               "all monitor tasks created cpu=%u heap_stack=%u sensor=%u comm=%u",
               (unsigned)(g_runtime.cpu_task != NULL),
               (unsigned)(g_runtime.heap_stack_task != NULL),
               (unsigned)(g_runtime.sensor_health_task != NULL),
               (unsigned)(g_runtime.communication_task != NULL));

    return ok;
}

void MonitoringTasks_EnterSafeMode(void)
{
    if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(50)) != pdTRUE)
    {
        return;
    }

    /* Safe mode policy: keep CPU/memory/communication supervision alive, pause sensor health task. */
    if (delete_task_for_subsystem(SUBSYSTEM_SENSOR_HEALTH))
    {
        Logger_Log(LOG_WARN, "monitor", "safe mode: sensor health task stopped");
    }

    (void)xSemaphoreGive(g_monitorMutex);
}

void MonitoringTasks_ExitSafeMode(void)
{
    if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(50)) != pdTRUE)
    {
        return;
    }

    if (g_runtime.sensor_health_task == NULL)
    {
        if (create_task_for_subsystem(SUBSYSTEM_SENSOR_HEALTH))
        {
            Logger_Log(LOG_INFO, "monitor", "safe mode exit: sensor health task restarted");
        }
    }

    (void)xSemaphoreGive(g_monitorMutex);
}

bool MonitoringTasks_SetSubsystemEnabled(SubsystemId subsystem, bool enable)
{
    if (xSemaphoreTake(g_monitorMutex, pdMS_TO_TICKS(50)) != pdTRUE)
    {
        return false;
    }

    bool ok = false;
    if (enable)
    {
        ok = create_task_for_subsystem(subsystem);
    }
    else
    {
        ok = delete_task_for_subsystem(subsystem);
    }

    (void)xSemaphoreGive(g_monitorMutex);

    Logger_Log(LOG_INFO,
               "monitor",
               "subsystem=%s enable=%u result=%u",
               EventManager_SubsystemToString(subsystem),
               (unsigned)enable,
               (unsigned)ok);

    return ok;
}
