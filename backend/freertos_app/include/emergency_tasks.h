#ifndef EMERGENCY_TASKS_H
#define EMERGENCY_TASKS_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "event_manager.h"

typedef enum
{
    EMERGENCY_TASK_HIGH_TEMPERATURE = 0,
    EMERGENCY_TASK_RADIATION,
    EMERGENCY_TASK_LOW_BATTERY,
    EMERGENCY_TASK_MEMORY_RECOVERY,
    EMERGENCY_TASK_COMM_RECOVERY,
    EMERGENCY_TASK_MAX
} EmergencyTaskType;

typedef enum
{
    EMERGENCY_HISTORY_CREATED = 0,
    EMERGENCY_HISTORY_COOLDOWN_REJECT,
    EMERGENCY_HISTORY_HYSTERESIS_BLOCK,
    EMERGENCY_HISTORY_COMPLETED,
    EMERGENCY_HISTORY_FAILED
} EmergencyHistoryAction;

typedef struct
{
    TickType_t tick;
    EmergencyTaskType type;
    EmergencyHistoryAction action;
    HealthLevel level;
    float metric_value;
    char detail[96];
} EmergencyHistoryRecord;

/* Initializes emergency lifecycle manager state and synchronization. */
bool EmergencyTasks_Init(void);

/*
 * Event-driven API called by the event manager on every published system event.
 * This function decides whether an emergency task should be spawned.
 */
void EmergencyTasks_HandleEvent(const SystemEvent *event);

/* Copy the latest emergency history entries in chronological order. */
size_t EmergencyTasks_GetHistory(EmergencyHistoryRecord *buffer, size_t capacity);

#endif /* EMERGENCY_TASKS_H */
