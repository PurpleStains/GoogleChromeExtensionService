import axios from "axios";
import { logger } from "../../shared/logger.js";

export const allegroAxiosInstance = (credentials: string, userAgent: string) => {
    const baseURL = process.env.ALLEGRO_API_BASE_URL;
    const instance = axios.create({
        baseURL,
        timeout: 60000,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            "Access-Control-Allow-Origin": "*",
            'User-Agent': userAgent,
        },
    });

    instance.interceptors.request.use((config) => {
        if (credentials) {
            config.headers.Authorization = `Basic ${credentials}`;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => Promise.reject(error)
    );

    return instance;
};

export const allegroApiAxiosInstance = (accessToken: string, userAgent: string) => {
    const instance = axios.create({
        baseURL: "https://api.allegro.pl",
        timeout: 60000,
        headers: {
            Accept: "application/vnd.allegro.public.v1+json",
            'User-Agent': userAgent,
        },
    });

    instance.interceptors.request.use((config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        const sanitizedHeaders: Record<string, unknown> = { ...config.headers };
        if (sanitizedHeaders.Authorization) {
            sanitizedHeaders.Authorization = 'Bearer [REDACTED]';
        }
        logger.http('Allegro API request', {
            method: config.method?.toUpperCase(),
            url: config.url,
            params: config.params,
            headers: sanitizedHeaders,
        });
        return config;
    });

    instance.interceptors.response.use(
        (response) => {
            logger.http('Allegro API response', { url: response.config.url, status: response.status });
            return response;
        },
        (error) => {
            logger.error('Allegro API request failed', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.message,
            });
            return Promise.reject(error);
        }
    );

    return instance;
};