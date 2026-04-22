import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

const getTokenMock = jest.fn<(clientLogin: string) => Promise<Result<any>>>();
const isTokenExpiredMock = jest.fn<(token: any) => boolean>();
const prepareTokenMock = jest.fn<(tokenResponse: any) => any>();
const refreshAndSaveTokenMock = jest.fn<(clientLogin: string) => Promise<Result<any>>>();

jest.unstable_mockModule("../../infrastructure/allegro/repositories/firestore-tokens.repository.js", () => ({
    getToken: getTokenMock,
}));

jest.unstable_mockModule("../../infrastructure/allegro/utils/token.utils.js", () => ({
    isTokenExpired: isTokenExpiredMock,
    prepareToken: prepareTokenMock,
}));

jest.unstable_mockModule("./token-refresh.service.js", () => ({
    refreshAndSaveToken: refreshAndSaveTokenMock,
}));

let getValidToken: (clientLogin: string) => Promise<any>;

describe("getValidToken", () => {
    const clientLogin = "client-1";
    const existingToken = {
        accessToken: "old-access",
        refreshToken: "old-refresh",
        expiresIn: new Timestamp(1700000000, 0),
    };

    const refreshedTokenResponse = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        allegro_api: true,
        iss: "allegro",
    };

    const preparedToken = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: new Timestamp(1800000000, 0),
    };

    beforeAll(async () => {
        ({ getValidToken } = await import("./token.service.js"));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return failure when token retrieval fails", async () => {
        getTokenMock.mockResolvedValue(Result.error(new Error("db error")));

        const result = await getValidToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to retrieve existing token for client client-1");
    });

    it("should return failure when token value is undefined", async () => {
        getTokenMock.mockResolvedValue(Result.success(undefined as any));

        const result = await getValidToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("No existing token found for client client-1");
    });

    it("should return existing token when it is not expired", async () => {
        getTokenMock.mockResolvedValue(Result.success(existingToken));
        isTokenExpiredMock.mockReturnValue(false);

        const result = await getValidToken(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(existingToken);
        expect(refreshAndSaveTokenMock).not.toHaveBeenCalled();
        expect(prepareTokenMock).not.toHaveBeenCalled();
    });

    it("should return failure when refresh fails for expired token", async () => {
        getTokenMock.mockResolvedValue(Result.success(existingToken));
        isTokenExpiredMock.mockReturnValue(true);
        refreshAndSaveTokenMock.mockResolvedValue(Result.error(new Error("refresh failed")));

        const result = await getValidToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to refresh token for client client-1 refresh failed");
    });

    it("should return prepared token when refresh succeeds", async () => {
        getTokenMock.mockResolvedValue(Result.success(existingToken));
        isTokenExpiredMock.mockReturnValue(true);
        refreshAndSaveTokenMock.mockResolvedValue(Result.success(refreshedTokenResponse));
        prepareTokenMock.mockReturnValue(preparedToken);

        const result = await getValidToken(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(preparedToken);
        expect(refreshAndSaveTokenMock).toHaveBeenCalledWith(clientLogin);
        expect(prepareTokenMock).toHaveBeenCalledWith(refreshedTokenResponse);
    });
});
