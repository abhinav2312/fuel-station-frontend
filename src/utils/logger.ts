/**
 * Professional Logging System for Fuel Station Management
 * Provides comprehensive logging for production debugging
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4
}

export enum LogCategory {
    API = 'API',
    USER_ACTION = 'USER_ACTION',
    FORM_SUBMISSION = 'FORM_SUBMISSION',
    NAVIGATION = 'NAVIGATION',
    ERROR = 'ERROR',
    PERFORMANCE = 'PERFORMANCE',
    SECURITY = 'SECURITY',
    DATABASE = 'DATABASE',
    AUTHENTICATION = 'AUTHENTICATION',
    BUSINESS_LOGIC = 'BUSINESS_LOGIC'
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    page: string;
    userId?: string;
    sessionId: string;
    userAgent: string;
    url: string;
    data?: any;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    performance?: {
        duration: number;
        memoryUsage?: number;
    };
    apiCall?: {
        method: string;
        url: string;
        status?: number;
        responseTime: number;
        requestSize?: number;
        responseSize?: number;
    };
}

class Logger {
    private logs: LogEntry[] = [];
    private maxLogs = 1000; // Keep last 1000 logs in memory
    private sessionId: string;
    private currentPage: string = '';

    constructor() {
        this.sessionId = this.generateSessionId();
        this.setupErrorHandlers();
        this.setupPerformanceMonitoring();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private setupErrorHandlers(): void {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.log(LogLevel.ERROR, LogCategory.ERROR, 'Global Error', {
                error: {
                    name: event.error?.name || 'Unknown',
                    message: event.error?.message || event.message,
                    stack: event.error?.stack
                },
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.log(LogLevel.ERROR, LogCategory.ERROR, 'Unhandled Promise Rejection', {
                error: {
                    name: 'PromiseRejection',
                    message: event.reason?.message || String(event.reason),
                    stack: event.reason?.stack
                }
            });
        });
    }

    private setupPerformanceMonitoring(): void {
        // Monitor page load performance
        window.addEventListener('load', () => {
            if (performance.timing) {
                const timing = performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;

                this.log(LogLevel.INFO, LogCategory.PERFORMANCE, 'Page Load Performance', {
                    performance: {
                        duration: loadTime,
                        memoryUsage: (performance as any).memory?.usedJSHeapSize
                    },
                    timing: {
                        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                        firstPaint: timing.responseStart - timing.navigationStart,
                        totalLoad: loadTime
                    }
                });
            }
        });
    }

    setCurrentPage(page: string): void {
        this.currentPage = page;
    }

    private createLogEntry(
        level: LogLevel,
        category: LogCategory,
        message: string,
        data?: any
    ): LogEntry {
        return {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            page: this.currentPage,
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            data,
            performance: {
                duration: 0,
                memoryUsage: (performance as any).memory?.usedJSHeapSize
            }
        };
    }

    log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
        const entry = this.createLogEntry(level, category, message, data);

        // Add to in-memory logs
        this.logs.push(entry);

        // Keep only last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output with appropriate level
        const consoleMethod = this.getConsoleMethod(level);
        const logMessage = `[${LogCategory[category]}] ${message}`;

        if (data) {
            consoleMethod(logMessage, data);
        } else {
            consoleMethod(logMessage);
        }

        // Send to backend in production
        if ((window as any).process?.env?.NODE_ENV === 'production') {
            this.sendToBackend(entry);
        }
    }

    private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
        switch (level) {
            case LogLevel.DEBUG:
                return console.debug;
            case LogLevel.INFO:
                return console.info;
            case LogLevel.WARN:
                return console.warn;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                return console.error;
            default:
                return console.log;
        }
    }

    private async sendToBackend(entry: LogEntry): Promise<void> {
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entry)
            });
        } catch (error) {
            console.error('Failed to send log to backend:', error);
        }
    }

    // Convenience methods
    debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, LogCategory.BUSINESS_LOGIC, message, data);
    }

    info(message: string, data?: any): void {
        this.log(LogLevel.INFO, LogCategory.BUSINESS_LOGIC, message, data);
    }

    warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, LogCategory.BUSINESS_LOGIC, message, data);
    }

    error(message: string, data?: any): void {
        this.log(LogLevel.ERROR, LogCategory.ERROR, message, data);
    }

    critical(message: string, data?: any): void {
        this.log(LogLevel.CRITICAL, LogCategory.ERROR, message, data);
    }

    // API logging
    apiCall(method: string, url: string, startTime: number, status?: number, requestSize?: number, responseSize?: number): void {
        const responseTime = Date.now() - startTime;
        this.log(LogLevel.INFO, LogCategory.API, `API Call: ${method} ${url}`, {
            apiCall: {
                method,
                url,
                status,
                responseTime,
                requestSize,
                responseSize
            }
        });
    }

    // User action logging
    userAction(action: string, data?: any): void {
        this.log(LogLevel.INFO, LogCategory.USER_ACTION, `User Action: ${action}`, data);
    }

    // Form submission logging
    formSubmission(formName: string, success: boolean, data?: any): void {
        this.log(
            success ? LogLevel.INFO : LogLevel.ERROR,
            LogCategory.FORM_SUBMISSION,
            `Form Submission: ${formName} - ${success ? 'Success' : 'Failed'}`,
            data
        );
    }

    // Navigation logging
    navigation(from: string, to: string): void {
        this.log(LogLevel.INFO, LogCategory.NAVIGATION, `Navigation: ${from} → ${to}`);
    }

    // Get logs
    getLogs(filter?: {
        level?: LogLevel;
        category?: LogCategory;
        page?: string;
        startTime?: string;
        endTime?: string;
    }): LogEntry[] {
        let filteredLogs = [...this.logs];

        if (filter) {
            if (filter.level !== undefined) {
                filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
            }
            if (filter.category) {
                filteredLogs = filteredLogs.filter(log => log.category === filter.category);
            }
            if (filter.page) {
                filteredLogs = filteredLogs.filter(log => log.page === filter.page);
            }
            if (filter.startTime) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
            }
            if (filter.endTime) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
            }
        }

        return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Export logs
    exportLogs(format: 'json' | 'csv' = 'json'): string {
        const logs = this.getLogs();

        if (format === 'csv') {
            const headers = ['Timestamp', 'Level', 'Category', 'Page', 'Message', 'Data'];
            const rows = logs.map(log => [
                log.timestamp,
                LogLevel[log.level],
                LogCategory[log.category],
                log.page,
                log.message,
                JSON.stringify(log.data || {})
            ]);

            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }

        return JSON.stringify(logs, null, 2);
    }

    // Clear logs
    clearLogs(): void {
        this.logs = [];
    }

    // Get session info
    getSessionInfo(): { sessionId: string; currentPage: string; logCount: number } {
        return {
            sessionId: this.sessionId,
            currentPage: this.currentPage,
            logCount: this.logs.length
        };
    }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
    debug: (message: string, data?: any) => logger.debug(message, data),
    info: (message: string, data?: any) => logger.info(message, data),
    warn: (message: string, data?: any) => logger.warn(message, data),
    error: (message: string, data?: any) => logger.error(message, data),
    critical: (message: string, data?: any) => logger.critical(message, data),
    api: (method: string, url: string, startTime: number, status?: number, requestSize?: number, responseSize?: number) =>
        logger.apiCall(method, url, startTime, status, requestSize, responseSize),
    userAction: (action: string, data?: any) => logger.userAction(action, data),
    formSubmission: (formName: string, success: boolean, data?: any) =>
        logger.formSubmission(formName, success, data),
    navigation: (from: string, to: string) => logger.navigation(from, to)
};
