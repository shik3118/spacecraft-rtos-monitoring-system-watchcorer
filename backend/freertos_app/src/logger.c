#include "logger.h"

#include <stdarg.h>
#include <stdio.h>
#include <string.h>

#include "event_manager.h"
#include "config.h"

static QueueHandle_t g_qLogs = NULL;
static TaskHandle_t g_loggerTask = NULL;

static const char *level_to_string(LogLevel level)
{
    switch (level)
    {
        case LOG_DEBUG:
            return "DEBUG";
        case LOG_INFO:
            return "INFO";
        case LOG_WARN:
            return "WARN";
        case LOG_ERROR:
            return "ERROR";
        default:
            return "UNKNOWN";
    }
}

static void logger_task(void *params)
{
    (void)params;

    LogMessage msg;
    for (;;)
    {
        if (xQueueReceive(g_qLogs, &msg, portMAX_DELAY) == pdTRUE)
        {
            SemaphoreHandle_t logMutex = EventManager_GetLogMutex();
            if (logMutex != NULL)
            {
                (void)xSemaphoreTake(logMutex, pdMS_TO_TICKS(50));
            }

            (void)printf("[LOG][%10lu][%s][%s] %s\n",
                         (unsigned long)msg.tick,
                         level_to_string(msg.level),
                         msg.module,
                         msg.text);
            (void)fflush(stdout);

            if (logMutex != NULL)
            {
                (void)xSemaphoreGive(logMutex);
            }
        }
    }
}

bool Logger_Init(void)
{
    g_qLogs = xQueueCreate(LEN_Q_LOG_MESSAGES, sizeof(LogMessage));
    if (g_qLogs == NULL)
    {
        return false;
    }

    vQueueAddToRegistry(g_qLogs, "qLogMessages");

    const BaseType_t ok = xTaskCreate(logger_task,
                                      "TaskLogger",
                                      STACK_SIZE_LOGGER,
                                      NULL,
                                      PRIO_LOGGER,
                                      &g_loggerTask);

    return (ok == pdPASS);
}

void Logger_Log(LogLevel level, const char *module, const char *fmt, ...)
{
    if ((g_qLogs == NULL) || (fmt == NULL))
    {
        return;
    }

    LogMessage msg;
    (void)memset(&msg, 0, sizeof(msg));
    msg.tick = xTaskGetTickCount();
    msg.level = level;

    (void)snprintf(msg.module, sizeof(msg.module), "%s", (module != NULL) ? module : "unknown");

    va_list args;
    va_start(args, fmt);
    (void)vsnprintf(msg.text, sizeof(msg.text), fmt, args);
    va_end(args);

    (void)xQueueSend(g_qLogs, &msg, 0);
}

QueueHandle_t Logger_GetQueueHandle(void)
{
    return g_qLogs;
}
