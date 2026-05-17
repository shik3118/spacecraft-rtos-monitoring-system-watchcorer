#ifndef MONITORING_TASKS_H
#define MONITORING_TASKS_H

#include <stdbool.h>

#include "event_manager.h"

/*
 * Monitoring layer tasks implemented by this module:
 *  - CPU Monitor Task
 *  - Heap/Stack Monitor Task
 *  - Sensor Health Task
 *  - Communication Monitor Task
 */

bool MonitoringTasks_Init(void);
bool MonitoringTasks_StartAll(void);
void MonitoringTasks_EnterSafeMode(void);
void MonitoringTasks_ExitSafeMode(void);
bool MonitoringTasks_SetSubsystemEnabled(SubsystemId subsystem, bool enable);

#endif /* MONITORING_TASKS_H */
