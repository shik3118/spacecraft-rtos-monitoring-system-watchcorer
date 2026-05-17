#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>

/*
 * Global application configuration for Linux FreeRTOS simulation.
 * Keep this file platform-neutral so it can be reused on STM32/ESP32 ports.
 */

#define APP_NAME                                "Spacecraft Monitoring RTOS Backend"
#define APP_SPACECRAFT_ID                       "SIM-ORBITER-01"
#define APP_PROTOCOL_VERSION                    (1U)

/* Task stack sizes (words, FreeRTOS-style). */
#define STACK_SIZE_MAIN                         (768U)
#define STACK_SIZE_MONITOR                      (768U)
#define STACK_SIZE_EMERGENCY                    (1024U)
#define STACK_SIZE_WATCHDOG                     (768U)
#define STACK_SIZE_TELEMETRY                    (1024U)
#define STACK_SIZE_LOGGER                       (768U)
#define STACK_SIZE_SAFE_MODE                    (768U)

/* Task priorities (higher number = higher priority). */
#define PRIO_WATCHDOG                           (6U)
#define PRIO_EMERGENCY                          (5U)
#define PRIO_EMERGENCY_RESPONSE                 (7U)
#define PRIO_STATE_MANAGER_HELPERS              (5U)
#define PRIO_MONITOR                            (4U)
#define PRIO_MONITOR_COMMUNICATION              (4U)
#define PRIO_TELEMETRY                          (3U)
#define PRIO_LOGGER                             (2U)

/* Queue lengths */
#define LEN_Q_EMERGENCY_EVENTS                  (64U)
#define LEN_Q_TELEMETRY_EVENTS                  (128U)
#define LEN_Q_HEARTBEATS                        (64U)
#define LEN_Q_LOG_MESSAGES                      (128U)
#define LEN_Q_MONITOR_SAMPLES                   (64U)

/* Timing configuration (ms) */
#define PERIOD_CPU_MONITOR_MS                   (100U)
#define PERIOD_HEAP_STACK_MONITOR_MS            (500U)
#define PERIOD_SENSOR_HEALTH_MONITOR_MS         (200U)
#define PERIOD_COMMUNICATION_MONITOR_MS         (150U)

#define PERIOD_WATCHDOG_SCAN_MS                 (100U)
#define PERIOD_TELEMETRY_HK_MS                  (500U)
#define PERIOD_SAFE_MODE_BEACON_MS              (1000U)
#define PERIOD_WD_BEACON_MS                     (1000U)
#define PERIOD_EMERGENCY_STEP_MS                (120U)

/* Hysteresis thresholds for simulation metrics. */
#define POWER_WARN_HIGH                         (82.0f)
#define POWER_WARN_LOW                          (78.0f)
#define POWER_CRIT_HIGH                         (90.0f)
#define POWER_CRIT_LOW                          (85.0f)

#define THERMAL_WARN_HIGH                       (65.0f)
#define THERMAL_WARN_LOW                        (60.0f)
#define THERMAL_CRIT_HIGH                       (78.0f)
#define THERMAL_CRIT_LOW                        (72.0f)

#define COMMS_WARN_HIGH                         (75.0f)
#define COMMS_WARN_LOW                          (70.0f)
#define COMMS_CRIT_HIGH                         (88.0f)
#define COMMS_CRIT_LOW                          (82.0f)

#define ADCS_WARN_HIGH                          (70.0f)
#define ADCS_WARN_LOW                           (66.0f)
#define ADCS_CRIT_HIGH                          (86.0f)
#define ADCS_CRIT_LOW                           (80.0f)

#define PAYLOAD_WARN_HIGH                       (73.0f)
#define PAYLOAD_WARN_LOW                        (68.0f)
#define PAYLOAD_CRIT_HIGH                       (87.0f)
#define PAYLOAD_CRIT_LOW                        (83.0f)

/* Monitoring threshold configuration. */
#define CPU_WARN_HIGH_PERCENT                   (78.0f)
#define CPU_WARN_LOW_PERCENT                    (72.0f)
#define CPU_CRIT_HIGH_PERCENT                   (90.0f)
#define CPU_CRIT_LOW_PERCENT                    (84.0f)

#define HEAP_WARN_LOW_BYTES                     (64U * 1024U)
#define HEAP_CRIT_LOW_BYTES                     (40U * 1024U)

#define STACK_WARN_LOW_WORDS                    (120U)
#define STACK_CRIT_LOW_WORDS                    (80U)

#define SENSOR_WARN_HIGH_SCORE                  (76.0f)
#define SENSOR_WARN_LOW_SCORE                   (70.0f)
#define SENSOR_CRIT_HIGH_SCORE                  (88.0f)
#define SENSOR_CRIT_LOW_SCORE                   (82.0f)

#define COMM_WARN_HIGH_PERCENT                  (74.0f)
#define COMM_WARN_LOW_PERCENT                   (68.0f)
#define COMM_CRIT_HIGH_PERCENT                  (86.0f)
#define COMM_CRIT_LOW_PERCENT                   (80.0f)

/* Watchdog timeout per subsystem (ms). */
#define WD_TIMEOUT_CPU_MS                       (500U)
#define WD_TIMEOUT_HEAP_STACK_MS                (900U)
#define WD_TIMEOUT_SENSOR_HEALTH_MS             (700U)
#define WD_TIMEOUT_COMMUNICATION_MS             (650U)

/* Watchdog recovery policy */
#define WD_RESTART_LIMIT_DEFAULT                (3U)
#define WD_RESTART_COOLDOWN_MS                  (3000U)
#define WD_RECOVERY_GRACE_MS                    (1500U)
#define WD_HISTORY_DEPTH                        (96U)

/* Emergency policy */
#define EMERGENCY_CRITICAL_EVENTS_FOR_SAFE_MODE (2U)
#define EMERGENCY_RECOVERY_COOLDOWN_MS          (8000U)
#define EMERGENCY_TASK_COOLDOWN_MS              (6000U)
#define EMERGENCY_MAX_HISTORY                   (80U)

/* Emergency trigger hysteresis thresholds */
#define TEMP_TRIGGER_ENTER                      (82.0f)
#define TEMP_TRIGGER_EXIT                       (76.0f)
#define RAD_TRIGGER_ENTER                       (89.0f)
#define RAD_TRIGGER_EXIT                        (83.0f)
#define LOW_BATTERY_ENTER                       (68.0f)
#define LOW_BATTERY_EXIT                        (72.0f)
#define MEMORY_PRESSURE_ENTER                   (HEAP_CRIT_LOW_BYTES)
#define MEMORY_PRESSURE_EXIT                    (HEAP_WARN_LOW_BYTES)
#define COMM_FAILURE_ENTER                      (86.0f)
#define COMM_FAILURE_EXIT                       (80.0f)

/* Event group bits */
#define EVT_BIT_BOOT_COMPLETE                   (1UL << 0)
#define EVT_BIT_SAFE_MODE_ACTIVE                (1UL << 1)
#define EVT_BIT_CRITICAL_FAULT                  (1UL << 2)
#define EVT_BIT_WATCHDOG_OK                     (1UL << 3)
#define EVT_BIT_SHUTDOWN_REQUESTED              (1UL << 4)

#endif /* CONFIG_H */
