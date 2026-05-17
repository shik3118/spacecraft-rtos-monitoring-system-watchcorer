#ifndef EVENT_MANAGER_H
#define EVENT_MANAGER_H

#include <stdbool.h>
#include <stdint.h>

#include "FreeRTOS.h"
#include "event_groups.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"

#include "config.h"

typedef enum
{
    SUBSYSTEM_CPU = 0,
    SUBSYSTEM_HEAP_STACK,
    SUBSYSTEM_SENSOR_HEALTH,
    SUBSYSTEM_COMMUNICATION,
    SUBSYSTEM_WATCHDOG,
    SUBSYSTEM_EMERGENCY,
    SUBSYSTEM_SYSTEM,
    /* Legacy subsystem IDs retained for compatibility with older payload events. */
    SUBSYSTEM_POWER,
    SUBSYSTEM_THERMAL,
    SUBSYSTEM_COMMS,
    SUBSYSTEM_ADCS,
    SUBSYSTEM_PAYLOAD,
    SUBSYSTEM_MAX
} SubsystemId;

typedef enum
{
    HEALTH_NOMINAL = 0,
    HEALTH_WARNING,
    HEALTH_CRITICAL
} HealthLevel;

typedef enum
{
    EVENT_TYPE_HEALTH = 0,
    EVENT_TYPE_FAULT,
    EVENT_TYPE_MODE_CHANGE,
    EVENT_TYPE_WATCHDOG,
    EVENT_TYPE_SAFE_MODE,
    EVENT_TYPE_DIAGNOSTIC
} EventType;

typedef struct
{
    TickType_t tick;
    EventType type;
    SubsystemId source;
    HealthLevel level;
    float metric_value;
    char description[96];
} SystemEvent;

/* Centralized initialization of core synchronization primitives. */
bool EventManager_Init(void);

/* Event publish APIs: event-driven fan-out to emergency and telemetry queues. */
BaseType_t EventManager_PublishEvent(const SystemEvent *event, TickType_t timeout);
BaseType_t EventManager_PublishEventFromISR(const SystemEvent *event, BaseType_t *pxHigherPriorityTaskWoken);

/* Queue/event group accessors. */
QueueHandle_t EventManager_GetEmergencyQueue(void);
QueueHandle_t EventManager_GetTelemetryQueue(void);
EventGroupHandle_t EventManager_GetSystemEventGroup(void);

/* Global synchronization objects shared across modules. */
SemaphoreHandle_t EventManager_GetStateMutex(void);
SemaphoreHandle_t EventManager_GetLogMutex(void);
SemaphoreHandle_t EventManager_GetTelemetryMutex(void);
SemaphoreHandle_t EventManager_GetWatchdogPulseSemaphore(void);

/* Utility naming helpers for telemetry/logger formatting. */
const char *EventManager_SubsystemToString(SubsystemId id);
const char *EventManager_EventTypeToString(EventType type);
const char *EventManager_HealthToString(HealthLevel level);

#endif /* EVENT_MANAGER_H */
