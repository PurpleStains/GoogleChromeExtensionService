import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";

const requestUseMock = jest.fn();
const responseUseMock = jest.fn();
const createMock = jest.fn(() => ({
    interceptors: {
        request: { use: requestUseMock },
        response: { use: responseUseMock },
    },
}));

describe("allegroAxiosInstance", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(axios, "create").mockImplementation(createMock as any);
        delete process.env.ALLEGRO_API_BASE_URL;
    });

    it("should create axios instance with expected defaults", async () => {
        process.env.ALLEGRO_API_BASE_URL = "https://api.allegro.pl";

        const { allegroAxiosInstance } = await import("./allegro.client.js");
        allegroAxiosInstance("credentials", "TestAgent/1.0");

        expect(createMock).toHaveBeenCalledTimes(1);
        expect((createMock as any).mock.calls[0][0]).toEqual({
            baseURL: "https://api.allegro.pl",
            timeout: 60000,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Access-Control-Allow-Origin": "*",
                "User-Agent": "TestAgent/1.0",
            },
        });
    });

    it("should register request and response interceptors", async () => {
        const { allegroAxiosInstance } = await import("./allegro.client.js");
        allegroAxiosInstance("credentials", "TestAgent/1.0");

        expect(requestUseMock).toHaveBeenCalledTimes(1);
        expect(responseUseMock).toHaveBeenCalledTimes(1);
    });

    it("request interceptor should set Authorization header when credentials exist", async () => {
        const { allegroAxiosInstance } = await import("./allegro.client.js");
        allegroAxiosInstance("abc123", "TestAgent/1.0");

        const requestInterceptor = requestUseMock.mock.calls[0][0] as (config: any) => any;
        const config = { headers: {} };

        const result = requestInterceptor(config);

        expect(result.headers.Authorization).toBe("Basic abc123");
    });

    it("request interceptor should keep config unchanged when credentials are empty", async () => {
        const { allegroAxiosInstance } = await import("./allegro.client.js");
        allegroAxiosInstance("", "TestAgent/1.0");

        const requestInterceptor = requestUseMock.mock.calls[0][0] as (config: any) => any;
        const config = { headers: {} };

        const result = requestInterceptor(config);

        expect(result).toEqual(config);
        expect(result.headers.Authorization).toBeUndefined();
    });
});
