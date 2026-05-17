#ifndef WATCHDOG_H
#define WATCHDOG_H

#include <stdbool.h>
#include <stddef.h>

#include "event_manager.h"

typedef enum
{
    WD_SLOT_HEALTHY = 0,
    WD_SLOT_TIMEOUT_DETECTED,
    WD_SLOT_RECOVERING,
    WD_SLOT_COOLDOWN,
    WD_SLOT_FAILED_LOCKED,
    WD_SLOT_SAFE_MODE_LOCKED
} WatchdogRecoveryState;

typedef enum
{
    WD_HISTORY_TIMEOUT = 0,
    WD_HISTORY_RESTART_ATTEMPT,
    WD_HISTORY_RECOVERY_SUCCESS,
    WD_HISTORY_RECOVERY_FAILURE,
    WD_HISTORY_SAFE_MODE_ESCALATION,
    WD_HISTORY_BEACON
} WatchdogHistoryType;

typedef struct
{
    TickType_t tick;
    SubsystemId subsystem;
    WatchdogHistoryType type;
    WatchdogRecoveryState state;
    uint16_t restart_count;
    char detail[96];
} WatchdogHistoryRecord;

typedef bool (*WatchdogRecoveryFn)(SubsystemId subsystem, void *context);

typedef struct
{
    SubsystemId subsystem;
    TickType_t timeout_ticks;

    /*
     * Recovery policy fields.
     * If not provided, module applies default policy and internal restart flow.
     */
    uint16_t restart_limit;
    TickType_t restart_cooldown_ticks;
    TickType_t recovery_grace_ticks;
    bool critical_for_safe_mode;

    WatchdogRecoveryFn recovery_fn;
    void *recovery_context;
} WatchdogRegistration;

typedef struct
{
    SubsystemId subsystem;
    TickType_t timeout_ticks;
    TickType_t last_heartbeat_tick;
    TickType_t last_restart_tick;
    uint16_t restart_count;
    bool registered;
    bool critical_for_safe_mode;
    WatchdogRecoveryState state;
} WatchdogSlotStatus;

bool Watchdog_Init(void);
bool Watchdog_Register(const WatchdogRegistration *registration);
void Watchdog_Heartbeat(SubsystemId subsystem);

/* Safe-mode lifecycle (degraded survival mode) */
void Watchdog_EnterSafeMode(const char *reason);
void Watchdog_ExitSafeMode(const char *reason);
bool Watchdog_IsSafeModeActive(void);

/* Introspection for telemetry/diagnostics */
size_t Watchdog_GetSlotStatus(WatchdogSlotStatus *buffer, size_t capacity);
size_t Watchdog_GetHistory(WatchdogHistoryRecord *buffer, size_t capacity);

#endif /* WATCHDOG_H */
