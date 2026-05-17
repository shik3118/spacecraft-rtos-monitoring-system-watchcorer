#ifndef LOGGER_H
#define LOGGER_H

#include <stdbool.h>

#include "FreeRTOS.h"
#include "queue.h"

typedef enum
{
    LOG_DEBUG = 0,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR
} LogLevel;

typedef struct
{
    TickType_t tick;
    LogLevel level;
    char module[24];
    char text[160];
} LogMessage;

bool Logger_Init(void);
void Logger_Log(LogLevel level, const char *module, const char *fmt, ...);
QueueHandle_t Logger_GetQueueHandle(void);

#endif /* LOGGER_H */
