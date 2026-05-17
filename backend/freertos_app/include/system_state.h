#ifndef SYSTEM_STATE_H
#define SYSTEM_STATE_H

#include <stdbool.h>

#include "event_manager.h"

typedef enum
{
    SYSTEM_MODE_INIT = 0,
    SYSTEM_MODE_BOOT_SELF_TEST,
    SYSTEM_MODE_NOMINAL,
    SYSTEM_MODE_DEGRADED,
    SYSTEM_MODE_SAFE,
    SYSTEM_MODE_EMERGENCY_SHUTDOWN
} SystemMode;

typedef struct
{
    SystemMode mode;
    TickType_t last_transition_tick;
    char reason[96];
} SystemStateSnapshot;

bool SystemState_Init(void);
SystemMode SystemState_GetMode(void);
bool SystemState_GetSnapshot(SystemStateSnapshot *outSnapshot);

/*
 * Transition guard used by supervisory modules.
 * Emits a MODE_CHANGE event when transition is successful.
 */
bool SystemState_TransitionTo(SystemMode newMode, const char *reason, SubsystemId initiator);

const char *SystemState_ModeToString(SystemMode mode);

#endif /* SYSTEM_STATE_H */
