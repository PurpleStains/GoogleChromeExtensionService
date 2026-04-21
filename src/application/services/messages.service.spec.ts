import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";
import { getValidToken } from "./token.service.js";
import { refreshAndSaveToken } from "./token-refresh.service.js";
import { recentBuyerThreads } from "./messages.service.js";

jest.mock("./token.service.js", () => ({
    getValidToken: jest.fn(),
}));

jest.mock("./token-refresh.service.js", () => ({
    refreshAndSaveToken: jest.fn(),
}));

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

    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should return failure when getValidToken fails", async () => {
        jest.mocked(getValidToken).mockResolvedValue(Result.error(new Error("token missing")));

        const result = await recentBuyerThreads(clientLogin, customerId);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Unrecognized client login or token retrieval failed");
    });

    it("should return failure when refresh token fails", async () => {
        jest.mocked(getValidToken).mockResolvedValue(Result.success(validToken));
        jest.mocked(refreshAndSaveToken).mockResolvedValue(Result.error(new Error("refresh failed")));

        const result = await recentBuyerThreads(clientLogin, customerId);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to refresh token for client");
    });

    it("should return only recent messages for the selected customer", async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

        jest.mocked(getValidToken).mockResolvedValue(Result.success(validToken));
        jest.mocked(refreshAndSaveToken).mockResolvedValue(Result.success(refreshResponse));

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
        expect(refreshAndSaveToken).toHaveBeenCalledWith(clientLogin);

        jest.useRealTimers();
    });

    it("should throw when listing threads fails", async () => {
        jest.mocked(getValidToken).mockResolvedValue(Result.success(validToken));
        jest.mocked(refreshAndSaveToken).mockResolvedValue(Result.success(refreshResponse));

        const fetchMock = jest.mocked(global.fetch as any);
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => "internal",
        } as any);

        await expect(recentBuyerThreads(clientLogin, customerId)).rejects.toThrow("listAllThreads failed");
    });
});
