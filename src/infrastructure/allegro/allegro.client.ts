import axios from "axios";

export const allegroAxiosInstance = (credentials: string) => {
    const baseURL = process.env.ALLEGRO_API_BASE_URL;
    const instance = axios.create({
        baseURL,
        timeout: 60000,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            "Access-Control-Allow-Origin": "*",
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