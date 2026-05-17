#include "system_state.h"

#include <stdio.h>
#include <string.h>

#include "event_manager.h"

static SystemStateSnapshot g_state;

static bool is_transition_valid(SystemMode from, SystemMode to)
{
    if (from == to)
    {
        return true;
    }

    switch (from)
    {
        case SYSTEM_MODE_INIT:
            return (to == SYSTEM_MODE_BOOT_SELF_TEST);
        case SYSTEM_MODE_BOOT_SELF_TEST:
            return (to == SYSTEM_MODE_NOMINAL || to == SYSTEM_MODE_SAFE || to == SYSTEM_MODE_DEGRADED);
        case SYSTEM_MODE_NOMINAL:
            return (to == SYSTEM_MODE_DEGRADED || to == SYSTEM_MODE_SAFE || to == SYSTEM_MODE_EMERGENCY_SHUTDOWN);
        case SYSTEM_MODE_DEGRADED:
            return (to == SYSTEM_MODE_NOMINAL || to == SYSTEM_MODE_SAFE || to == SYSTEM_MODE_EMERGENCY_SHUTDOWN);
        case SYSTEM_MODE_SAFE:
            return (to == SYSTEM_MODE_DEGRADED || to == SYSTEM_MODE_NOMINAL || to == SYSTEM_MODE_EMERGENCY_SHUTDOWN);
        case SYSTEM_MODE_EMERGENCY_SHUTDOWN:
            return false;
        default:
            return false;
    }
}

bool SystemState_Init(void)
{
    SemaphoreHandle_t mutex = EventManager_GetStateMutex();
    if (mutex == NULL)
    {
        return false;
    }

    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        return false;
    }

    g_state.mode = SYSTEM_MODE_INIT;
    g_state.last_transition_tick = xTaskGetTickCount();
    (void)snprintf(g_state.reason, sizeof(g_state.reason), "system init");

    (void)xSemaphoreGive(mutex);
    return true;
}

SystemMode SystemState_GetMode(void)
{
    SystemStateSnapshot snapshot;
    if (SystemState_GetSnapshot(&snapshot))
    {
        return snapshot.mode;
    }
    return SYSTEM_MODE_EMERGENCY_SHUTDOWN;
}

bool SystemState_GetSnapshot(SystemStateSnapshot *outSnapshot)
{
    if (outSnapshot == NULL)
    {
        return false;
    }

    SemaphoreHandle_t mutex = EventManager_GetStateMutex();
    if (mutex == NULL)
    {
        return false;
    }

    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        return false;
    }

    *outSnapshot = g_state;

    (void)xSemaphoreGive(mutex);
    return true;
}

bool SystemState_TransitionTo(SystemMode newMode, const char *reason, SubsystemId initiator)
{
    SemaphoreHandle_t mutex = EventManager_GetStateMutex();
    if (mutex == NULL)
    {
        return false;
    }

    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        return false;
    }

    if (!is_transition_valid(g_state.mode, newMode))
    {
        (void)xSemaphoreGive(mutex);
        return false;
    }

    g_state.mode = newMode;
    g_state.last_transition_tick = xTaskGetTickCount();
    (void)snprintf(g_state.reason,
                   sizeof(g_state.reason),
                   "%s",
                   (reason != NULL) ? reason : "unspecified");

    const SystemStateSnapshot snapshot = g_state;
    (void)xSemaphoreGive(mutex);

    SystemEvent ev = {
        .tick = snapshot.last_transition_tick,
        .type = EVENT_TYPE_MODE_CHANGE,
        .source = initiator,
        .level = (newMode == SYSTEM_MODE_NOMINAL) ? HEALTH_NOMINAL : HEALTH_WARNING,
        .metric_value = (float)newMode,
    };

    (void)snprintf(ev.description,
                   sizeof(ev.description),
                   "mode=%s reason=%s",
                   SystemState_ModeToString(newMode),
                   snapshot.reason);

    (void)EventManager_PublishEvent(&ev, pdMS_TO_TICKS(20));

    EventGroupHandle_t eg = EventManager_GetSystemEventGroup();
    if (eg != NULL)
    {
        if (newMode == SYSTEM_MODE_SAFE)
        {
            (void)xEventGroupSetBits(eg, EVT_BIT_SAFE_MODE_ACTIVE);
        }
        else
        {
            (void)xEventGroupClearBits(eg, EVT_BIT_SAFE_MODE_ACTIVE);
        }
    }

    return true;
}

const char *SystemState_ModeToString(SystemMode mode)
{
    switch (mode)
    {
        case SYSTEM_MODE_INIT:
            return "INIT";
        case SYSTEM_MODE_BOOT_SELF_TEST:
            return "BOOT_SELF_TEST";
        case SYSTEM_MODE_NOMINAL:
            return "NOMINAL";
        case SYSTEM_MODE_DEGRADED:
            return "DEGRADED";
        case SYSTEM_MODE_SAFE:
            return "SAFE";
        case SYSTEM_MODE_EMERGENCY_SHUTDOWN:
            return "EMERGENCY_SHUTDOWN";
        default:
            return "UNKNOWN";
    }
}
