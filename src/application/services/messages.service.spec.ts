import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";

const getValidTokenMock = jest.fn<(clientLogin: string) => Promise<Result<any>>>();
const refreshAndSaveTokenMock = jest.fn<(clientLogin: string) => Promise<Result<any>>>();

jest.unstable_mockModule("./token.service.js", () => ({
    getValidToken: getValidTokenMock,
}));

jest.unstable_mockModule("./token-refresh.service.js", () => ({
    refreshAndSaveToken: refreshAndSaveTokenMock,
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

    const refreshResponse = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        allegro_api: true,
        iss: "allegro",
    };

    beforeAll(async () => {
        ({ recentBuyerThreads } = await import("./messages.service.js"));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).fetch = jest.fn();
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

    it("should return failure when refresh token fails", async () => {
        getValidTokenMock.mockResolvedValue(Result.success(validToken));
        refreshAndSaveTokenMock.mockResolvedValue(Result.error(new Error("refresh failed")));

        const result = await recentBuyerThreads(clientLogin, customerId);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to refresh token for client");
    });

    it("should return only recent messages for the selected customer", async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

        getValidTokenMock.mockResolvedValue(Result.success(validToken));
        refreshAndSaveTokenMock.mockResolvedValue(Result.success(refreshResponse));

        const fetchMock = jest.mocked(global.fetch as any);
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
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
                }),
            } as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
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
                }),
            } as any);

        const result = await recentBuyerThreads(clientLogin, customerId);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual([
            expect.objectContaining({ id: "m-1", text: "recent message" }),
        ]);
        expect(refreshAndSaveTokenMock).toHaveBeenCalledWith(clientLogin);

        jest.useRealTimers();
    });

    it("should throw when listing threads fails", async () => {
        getValidTokenMock.mockResolvedValue(Result.success(validToken));
        refreshAndSaveTokenMock.mockResolvedValue(Result.success(refreshResponse));

        const fetchMock = jest.mocked(global.fetch as any);
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => "internal",
        } as any);

        await expect(recentBuyerThreads(clientLogin, customerId)).rejects.toThrow("listAllThreads failed");
    });
});
