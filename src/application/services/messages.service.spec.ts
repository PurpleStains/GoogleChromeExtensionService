import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";

const getValidTokenMock = jest.fn<(clientLogin: string) => Promise<Result<any>>>();
const getClientByLoginMock = jest.fn<(clientLogin: string) => Promise<Result<any>>>();
const getMock = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule("./token.service.js", () => ({
    getValidToken: getValidTokenMock,
}));

jest.unstable_mockModule("./clients.service.js", () => ({
    clientsService: {
        getClientByLogin: getClientByLoginMock,
    },
}));

jest.unstable_mockModule("../../infrastructure/allegro/allegro.client.js", () => ({
    allegroApiAxiosInstance: () => ({ get: getMock }),
}));

let recentBuyerThreads: (clientLogin: string, clientId: string) => Promise<any>;

describe("recentBuyerThreads", () => {
    const clientLogin = "seller-login";
    const customerId = "buyer-login";

    const validToken = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: new Timestamp(1800000000, 0),
    };

    beforeAll(async () => {
        ({ recentBuyerThreads } = await import("./messages.service.js"));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        getClientByLoginMock.mockResolvedValue(Result.success({ userAgent: "test-user-agent" }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should return failure when getValidToken fails", async () => {
        getValidTokenMock.mockResolvedValue(Result.error(new Error("token missing")));

        const result = await recentBuyerThreads(clientLogin, customerId);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Unrecognized client login or token retrieval failed");
    });

    it("should return only recent messages for the selected customer", async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

        getValidTokenMock.mockResolvedValue(Result.success(validToken));

        getMock
            .mockResolvedValueOnce({
                data: {
                    limit: 20,
                    offset: 0,
                    threads: [
                        {
                            id: "t-1",
                            read: false,
                            lastMessageDateTime: "2026-04-21T10:00:00.000Z",
                            interlocutor: { login: customerId, avatarUrl: "url" },
                        },
                    ],
                },
            })
            .mockResolvedValueOnce({
                data: {
                    limit: 20,
                    offset: 0,
                    messages: [
                        {
                            id: "m-1",
                            text: "recent message",
                            createdAt: "2026-04-20T10:00:00.000Z",
                            author: { login: customerId, isInterlocutor: true },
                            thread: { id: "t-1" },
                            type: "USER",
                        },
                        {
                            id: "m-2",
                            text: "old message",
                            createdAt: "2026-04-10T10:00:00.000Z",
                            author: { login: customerId, isInterlocutor: true },
                            thread: { id: "t-1" },
                            type: "USER",
                        },
                        {
                            id: "m-3",
                            text: "other author",
                            createdAt: "2026-04-20T11:00:00.000Z",
                            author: { login: "other", isInterlocutor: false },
                            thread: { id: "t-1" },
                            type: "USER",
                        },
                    ],
                },
            });

        const result = await recentBuyerThreads(clientLogin, customerId);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual([
            expect.objectContaining({ id: "m-1", text: "recent message" }),
        ]);

        jest.useRealTimers();
    });

    it("should throw when listing threads fails", async () => {
        getValidTokenMock.mockResolvedValue(Result.success(validToken));

        getMock.mockRejectedValueOnce(Object.assign(new Error("boom"), {
            isAxiosError: true,
            response: { status: 500, data: "internal" },
        }));

        await expect(recentBuyerThreads(clientLogin, customerId)).rejects.toThrow("listAllThreads failed");
    });
});
