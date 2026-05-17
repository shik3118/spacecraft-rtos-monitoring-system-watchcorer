#include <stdio.h>

#include "FreeRTOS.h"
#include "task.h"

#include "config.h"
#include "emergency_tasks.h"
#include "event_manager.h"
#include "logger.h"
#include "monitoring_tasks.h"
#include "system_state.h"
#include "telemetry.h"
#include "watchdog.h"

/*
 * Main startup routine for Linux FreeRTOS simulation.
 * Initialization order is deterministic to avoid race conditions between tasks
 * that share queues, event groups, and synchronization primitives.
 */
int main(void)
{
    (void)printf("Starting %s (%s)\n", APP_NAME, APP_SPACECRAFT_ID);

    if (!EventManager_Init())
    {
        (void)printf("FATAL: EventManager init failed\n");
        return 1;
    }

    if (!SystemState_Init())
    {
        (void)printf("FATAL: SystemState init failed\n");
        return 1;
    }

    if (!Logger_Init())
    {
        (void)printf("FATAL: Logger init failed\n");
        return 1;
    }

    Logger_Log(LOG_INFO, "main", "event manager and logger initialized");

    if (!Watchdog_Init())
    {
        Logger_Log(LOG_ERROR, "main", "watchdog init failed");
        return 1;
    }

    if (!Telemetry_Init())
    {
        Logger_Log(LOG_ERROR, "main", "telemetry init failed");
        return 1;
    }

    if (!MonitoringTasks_Init())
    {
        Logger_Log(LOG_ERROR, "main", "monitoring tasks init failed");
        return 1;
    }

    if (!EmergencyTasks_Init())
    {
        Logger_Log(LOG_ERROR, "main", "emergency tasks init failed");
        return 1;
    }

    (void)SystemState_TransitionTo(SYSTEM_MODE_BOOT_SELF_TEST, "boot sequence start", SUBSYSTEM_SYSTEM);

    if (!MonitoringTasks_StartAll())
    {
        Logger_Log(LOG_ERROR, "main", "failed to start one or more monitor tasks");
        return 1;
    }

    (void)SystemState_TransitionTo(SYSTEM_MODE_NOMINAL, "self test passed", SUBSYSTEM_SYSTEM);
    (void)xEventGroupSetBits(EventManager_GetSystemEventGroup(), EVT_BIT_BOOT_COMPLETE);

    Logger_Log(LOG_INFO, "main", "scheduler start");
    vTaskStartScheduler();

    /* Should never be reached unless scheduler startup fails. */
    Logger_Log(LOG_ERROR, "main", "scheduler terminated unexpectedly");
    return 1;
}

void vApplicationMallocFailedHook(void)
{
    (void)printf("[HOOK] Malloc failed\n");
    taskDISABLE_INTERRUPTS();
    for (;;)
    {
    }
}

void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName)
{
    (void)xTask;
    (void)printf("[HOOK] Stack overflow in task: %s\n", (pcTaskName != NULL) ? pcTaskName : "unknown");
    taskDISABLE_INTERRUPTS();
    for (;;)
    {
    }
}
