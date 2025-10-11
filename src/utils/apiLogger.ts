/**
 * API Request/Response Logging Interceptor
 * Automatically logs all API calls for debugging
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger, LogLevel, LogCategory } from './logger';

// Store original request sizes
const requestSizes = new Map<string, number>();

// Request interceptor
axios.interceptors.request.use(
    (config: any) => {
        const requestId = `${config.method?.toUpperCase()}_${config.url}_${Date.now()}`;
        const startTime = Date.now();

        // Store request info
        (config as any).requestId = requestId;
        (config as any).startTime = startTime;

        // Calculate request size
        let requestSize = 0;
        if (config.data) {
            requestSize = JSON.stringify(config.data).length;
        }
        if (config.params) {
            requestSize += JSON.stringify(config.params).length;
        }
        requestSizes.set(requestId, requestSize);

        // Log request
        logger.log(LogLevel.DEBUG, LogCategory.API, `API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            requestId,
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: config.headers,
            params: config.params,
            data: config.data,
            requestSize
        });

        return config;
    },
    (error: AxiosError) => {
        logger.error('API Request Error', {
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                config: error.config
            }
        });
        return Promise.reject(error);
    }
);

// Response interceptor
axios.interceptors.response.use(
    (response: AxiosResponse) => {
        const requestId = (response.config as any).requestId;
        const startTime = (response.config as any).startTime;
        const requestSize = requestSizes.get(requestId) || 0;
        const responseSize = JSON.stringify(response.data).length;
        const responseTime = Date.now() - startTime;

        // Log successful response
        logger.apiCall(
            response.config.method?.toUpperCase() || 'UNKNOWN',
            response.config.url || '',
            startTime,
            response.status,
            requestSize,
            responseSize
        );

        // Log detailed response for debugging
        logger.log(LogLevel.DEBUG, LogCategory.API, `API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            requestId,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            responseTime,
            requestSize,
            responseSize
        });

        // Clean up
        requestSizes.delete(requestId);

        return response;
    },
    (error: AxiosError) => {
        const requestId = (error.config as any)?.requestId;
        const startTime = (error.config as any)?.startTime;
        const requestSize = requestSizes.get(requestId || '') || 0;
        const responseTime = startTime ? Date.now() - startTime : 0;

        // Log error response
        logger.log(LogLevel.ERROR, LogCategory.API, `API Error: ${error.response?.status || 'NETWORK'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            requestId,
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            },
            config: {
                method: error.config?.method,
                url: error.config?.url,
                headers: error.config?.headers,
                params: error.config?.params,
                data: error.config?.data
            },
            responseTime,
            requestSize
        });

        // Clean up
        if (requestId) {
            requestSizes.delete(requestId);
        }

        return Promise.reject(error);
    }
);

export default axios;
