#include "event_manager.h"

#include <stdio.h>
#include <string.h>

#include "emergency_tasks.h"

static QueueHandle_t g_qEmergency = NULL;
static QueueHandle_t g_qTelemetry = NULL;
static EventGroupHandle_t g_eventGroup = NULL;

static SemaphoreHandle_t g_stateMutex = NULL;
static SemaphoreHandle_t g_logMutex = NULL;
static SemaphoreHandle_t g_telemetryMutex = NULL;
static SemaphoreHandle_t g_watchdogPulseSemaphore = NULL;

bool EventManager_Init(void)
{
    g_qEmergency = xQueueCreate(LEN_Q_EMERGENCY_EVENTS, sizeof(SystemEvent));
    g_qTelemetry = xQueueCreate(LEN_Q_TELEMETRY_EVENTS, sizeof(SystemEvent));
    g_eventGroup = xEventGroupCreate();

    g_stateMutex = xSemaphoreCreateMutex();
    g_logMutex = xSemaphoreCreateMutex();
    g_telemetryMutex = xSemaphoreCreateMutex();
    g_watchdogPulseSemaphore = xSemaphoreCreateBinary();

    if ((g_qEmergency == NULL) ||
        (g_qTelemetry == NULL) ||
        (g_eventGroup == NULL) ||
        (g_stateMutex == NULL) ||
        (g_logMutex == NULL) ||
        (g_telemetryMutex == NULL) ||
        (g_watchdogPulseSemaphore == NULL))
    {
        return false;
    }

    vQueueAddToRegistry(g_qEmergency, "qEmergencyEvents");
    vQueueAddToRegistry(g_qTelemetry, "qTelemetryEvents");

    return true;
}

BaseType_t EventManager_PublishEvent(const SystemEvent *event, TickType_t timeout)
{
    if (event == NULL)
    {
        return pdFAIL;
    }

    /* Emergency handling is now callback-driven (no permanent emergency queue consumer). */
    BaseType_t sentEmergency = pdPASS;
    BaseType_t sentTelemetry = xQueueSend(g_qTelemetry, event, timeout);

    if (event->level == HEALTH_CRITICAL)
    {
        (void)xEventGroupSetBits(g_eventGroup, EVT_BIT_CRITICAL_FAULT);
    }

    if (event->type == EVENT_TYPE_SAFE_MODE)
    {
        (void)xEventGroupSetBits(g_eventGroup, EVT_BIT_SAFE_MODE_ACTIVE);
    }

    /* Event-driven emergency lifecycle dispatch (no permanent emergency poller task). */
    EmergencyTasks_HandleEvent(event);

    return (sentEmergency == pdPASS && sentTelemetry == pdPASS) ? pdPASS : pdFAIL;
}

BaseType_t EventManager_PublishEventFromISR(const SystemEvent *event, BaseType_t *pxHigherPriorityTaskWoken)
{
    if (event == NULL)
    {
        return pdFAIL;
    }

    BaseType_t sentEmergency = pdPASS;
    BaseType_t sentTelemetry = xQueueSendFromISR(g_qTelemetry, event, pxHigherPriorityTaskWoken);

    return (sentEmergency == pdPASS && sentTelemetry == pdPASS) ? pdPASS : pdFAIL;
}

QueueHandle_t EventManager_GetEmergencyQueue(void)
{
    return g_qEmergency;
}

QueueHandle_t EventManager_GetTelemetryQueue(void)
{
    return g_qTelemetry;
}

EventGroupHandle_t EventManager_GetSystemEventGroup(void)
{
    return g_eventGroup;
}

SemaphoreHandle_t EventManager_GetStateMutex(void)
{
    return g_stateMutex;
}

SemaphoreHandle_t EventManager_GetLogMutex(void)
{
    return g_logMutex;
}

SemaphoreHandle_t EventManager_GetTelemetryMutex(void)
{
    return g_telemetryMutex;
}

SemaphoreHandle_t EventManager_GetWatchdogPulseSemaphore(void)
{
    return g_watchdogPulseSemaphore;
}

const char *EventManager_SubsystemToString(SubsystemId id)
{
    switch (id)
    {
        case SUBSYSTEM_CPU:
            return "cpu";
        case SUBSYSTEM_HEAP_STACK:
            return "heap_stack";
        case SUBSYSTEM_SENSOR_HEALTH:
            return "sensor_health";
        case SUBSYSTEM_COMMUNICATION:
            return "communication";
        case SUBSYSTEM_WATCHDOG:
            return "watchdog";
        case SUBSYSTEM_EMERGENCY:
            return "emergency";
        case SUBSYSTEM_SYSTEM:
            return "system";
        case SUBSYSTEM_POWER:
            return "power";
        case SUBSYSTEM_THERMAL:
            return "thermal";
        case SUBSYSTEM_COMMS:
            return "comms";
        case SUBSYSTEM_ADCS:
            return "adcs";
        case SUBSYSTEM_PAYLOAD:
            return "payload";
        default:
            return "unknown";
    }
}

const char *EventManager_EventTypeToString(EventType type)
{
    switch (type)
    {
        case EVENT_TYPE_HEALTH:
            return "health";
        case EVENT_TYPE_FAULT:
            return "fault";
        case EVENT_TYPE_MODE_CHANGE:
            return "mode_change";
        case EVENT_TYPE_WATCHDOG:
            return "watchdog";
        case EVENT_TYPE_SAFE_MODE:
            return "safe_mode";
        case EVENT_TYPE_DIAGNOSTIC:
            return "diagnostic";
        default:
            return "unknown";
    }
}

const char *EventManager_HealthToString(HealthLevel level)
{
    switch (level)
    {
        case HEALTH_NOMINAL:
            return "nominal";
        case HEALTH_WARNING:
            return "warning";
        case HEALTH_CRITICAL:
            return "critical";
        default:
            return "unknown";
    }
}
