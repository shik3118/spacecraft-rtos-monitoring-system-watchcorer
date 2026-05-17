#include "telemetry.h"

#include <stdio.h>
#include <string.h>

#include "config.h"
#include "event_manager.h"
#include "logger.h"
#include "system_state.h"

static TaskHandle_t g_telemetryTask = NULL;

static void emit_json_event(const SystemEvent *ev)
{
    SemaphoreHandle_t txMutex = EventManager_GetTelemetryMutex();
    if (txMutex != NULL)
    {
        (void)xSemaphoreTake(txMutex, pdMS_TO_TICKS(25));
    }

    (void)printf("{\"proto\":%u,\"sc\":\"%s\",\"tick\":%lu,\"type\":\"%s\","
                 "\"src\":\"%s\",\"level\":\"%s\",\"value\":%.2f,\"desc\":\"%s\"}\n",
                 APP_PROTOCOL_VERSION,
                 APP_SPACECRAFT_ID,
                 (unsigned long)ev->tick,
                 EventManager_EventTypeToString(ev->type),
                 EventManager_SubsystemToString(ev->source),
                 EventManager_HealthToString(ev->level),
                 (double)ev->metric_value,
                 ev->description);
    (void)fflush(stdout);

    if (txMutex != NULL)
    {
        (void)xSemaphoreGive(txMutex);
    }
}

static void emit_housekeeping(void)
{
    SystemStateSnapshot snapshot;
    if (!SystemState_GetSnapshot(&snapshot))
    {
        return;
    }

    SemaphoreHandle_t txMutex = EventManager_GetTelemetryMutex();
    if (txMutex != NULL)
    {
        (void)xSemaphoreTake(txMutex, pdMS_TO_TICKS(25));
    }

    QueueHandle_t emergencyQ = EventManager_GetEmergencyQueue();
    QueueHandle_t telemetryQ = EventManager_GetTelemetryQueue();

    (void)printf("{\"proto\":%u,\"sc\":\"%s\",\"tick\":%lu,\"type\":\"housekeeping\","
                 "\"mode\":\"%s\",\"q_emergency\":%lu,\"q_telemetry\":%lu}\n",
                 APP_PROTOCOL_VERSION,
                 APP_SPACECRAFT_ID,
                 (unsigned long)xTaskGetTickCount(),
                 SystemState_ModeToString(snapshot.mode),
                 (unsigned long)uxQueueMessagesWaiting(emergencyQ),
                 (unsigned long)uxQueueMessagesWaiting(telemetryQ));
    (void)fflush(stdout);

    if (txMutex != NULL)
    {
        (void)xSemaphoreGive(txMutex);
    }
}

static void telemetry_task(void *params)
{
    (void)params;

    QueueHandle_t telemetryQueue = EventManager_GetTelemetryQueue();
    TickType_t lastHousekeeping = xTaskGetTickCount();

    Logger_Log(LOG_INFO, "telemetry", "telemetry task started");

    for (;;)
    {
        SystemEvent ev;
        const BaseType_t received = xQueueReceive(telemetryQueue, &ev, pdMS_TO_TICKS(50));
        if (received == pdTRUE)
        {
            emit_json_event(&ev);
        }

        const TickType_t now = xTaskGetTickCount();
        if ((now - lastHousekeeping) >= pdMS_TO_TICKS(PERIOD_TELEMETRY_HK_MS))
        {
            emit_housekeeping();
            lastHousekeeping = now;
        }
    }
}

bool Telemetry_Init(void)
{
    const BaseType_t ok = xTaskCreate(telemetry_task,
                                      "TaskTelemetry",
                                      STACK_SIZE_TELEMETRY,
                                      NULL,
                                      PRIO_TELEMETRY,
                                      &g_telemetryTask);

    return (ok == pdPASS);
}
