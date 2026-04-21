import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";
import { getToken } from "../../infrastructure/allegro/repositories/firestore-tokens.repository.js";
import { isTokenExpired, prepareToken } from "../../infrastructure/allegro/utils/token.utils.js";
import { refreshAndSaveToken } from "./token-refresh.service.js";
import { getValidToken } from "./token.service.js";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../infrastructure/allegro/repositories/firestore-tokens.repository.js", () => ({
    getToken: jest.fn(),
}));

jest.mock("../../infrastructure/allegro/utils/token.utils.js", () => ({
    isTokenExpired: jest.fn(),
    prepareToken: jest.fn(),
}));

jest.mock("./token-refresh.service.js", () => ({
    refreshAndSaveToken: jest.fn(),
}));

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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return failure when token retrieval fails", async () => {
        jest.mocked(getToken).mockResolvedValue(Result.error(new Error("db error")));

        const result = await getValidToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to retrieve existing token for client client-1");
    });

    it("should return failure when token value is undefined", async () => {
        jest.mocked(getToken).mockResolvedValue(Result.success(undefined as any));

        const result = await getValidToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("No existing token found for client client-1");
    });

    it("should return existing token when it is not expired", async () => {
        jest.mocked(getToken).mockResolvedValue(Result.success(existingToken));
        jest.mocked(isTokenExpired).mockReturnValue(false);

        const result = await getValidToken(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(existingToken);
        expect(refreshAndSaveToken).not.toHaveBeenCalled();
        expect(prepareToken).not.toHaveBeenCalled();
    });

    it("should return failure when refresh fails for expired token", async () => {
        jest.mocked(getToken).mockResolvedValue(Result.success(existingToken));
        jest.mocked(isTokenExpired).mockReturnValue(true);
        jest.mocked(refreshAndSaveToken).mockResolvedValue(Result.error(new Error("refresh failed")));

        const result = await getValidToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to refresh token for client client-1 refresh failed");
    });

    it("should return prepared token when refresh succeeds", async () => {
        jest.mocked(getToken).mockResolvedValue(Result.success(existingToken));
        jest.mocked(isTokenExpired).mockReturnValue(true);
        jest.mocked(refreshAndSaveToken).mockResolvedValue(Result.success(refreshedTokenResponse));
        jest.mocked(prepareToken).mockReturnValue(preparedToken);

        const result = await getValidToken(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(preparedToken);
        expect(refreshAndSaveToken).toHaveBeenCalledWith(clientLogin);
        expect(prepareToken).toHaveBeenCalledWith(refreshedTokenResponse);
    });
});
