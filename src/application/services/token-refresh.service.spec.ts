import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";

const getClientByLoginMock = jest.fn();
const getTokenMock = jest.fn();
const saveTokenMock = jest.fn();
const allegroAxiosInstanceMock = jest.fn();
const prepareTokenMock = jest.fn();

jest.unstable_mockModule("./clients.service.js", () => ({
    clientsService: {
        getClientByLogin: getClientByLoginMock,
    },
}));

jest.unstable_mockModule("../../infrastructure/allegro/repositories/firestore-tokens.repository.js", () => ({
    getToken: getTokenMock,
    saveToken: saveTokenMock,
}));

jest.unstable_mockModule("../../infrastructure/allegro/allegro.client.js", () => ({
    allegroAxiosInstance: allegroAxiosInstanceMock,
}));

jest.unstable_mockModule("../../infrastructure/allegro/utils/token.utils.js", () => ({
    prepareToken: prepareTokenMock,
}));

let refreshAndSaveToken: (clientLogin: string) => Promise<any>;

describe("refreshAndSaveToken", () => {
    const clientLogin = "client-1";
    const clientData = {
        clientLogin,
        clientId: "id-1",
        clientSecret: "secret-1",
    };

    const internalToken = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: new Timestamp(1800000000, 0),
    };

    const refreshResponse = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        allegro_api: true,
        iss: "allegro",
    };

    const postMock = jest.fn<(...args: any[]) => Promise<any>>();

    beforeAll(async () => {
        ({ refreshAndSaveToken } = await import("./token-refresh.service.js"));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        postMock.mockReset();
        allegroAxiosInstanceMock.mockReturnValue({ post: postMock } as any);
    });

    it("should return success when token refresh flow succeeds", async () => {
        getClientByLoginMock.mockResolvedValue(Result.success(clientData));
        getTokenMock.mockResolvedValue(Result.success(internalToken));
        postMock.mockResolvedValue({ status: 200, data: refreshResponse });
        prepareTokenMock.mockReturnValue(internalToken);
        saveTokenMock.mockResolvedValue(Result.success());

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(refreshResponse);
        expect(allegroAxiosInstanceMock).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith("auth/oauth/token", expect.stringContaining("grant_type=refresh_token"));
        expect(saveTokenMock).toHaveBeenCalledWith(clientLogin, internalToken);
    });

    it("should fail when client lookup fails", async () => {
        getClientByLoginMock.mockResolvedValue(Result.error(new Error("missing client")));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("missing client");
    });

    it("should fail when client value is undefined", async () => {
        getClientByLoginMock.mockResolvedValue(Result.success(undefined as any));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe(`Client data not found for login: ${clientLogin}`);
    });

    it("should fail when stored token is missing", async () => {
        getClientByLoginMock.mockResolvedValue(Result.success(clientData));
        getTokenMock.mockResolvedValue(Result.error(new Error("token not found")));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe(`Token not found for the provided client login: ${clientLogin}`);
    });

    it("should fail when allegro responds with status >= 400", async () => {
        getClientByLoginMock.mockResolvedValue(Result.success(clientData));
        getTokenMock.mockResolvedValue(Result.success(internalToken));
        postMock.mockResolvedValue({ status: 400, data: { message: "bad request" } });

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to refresh token");
    });

    it("should fail when saveToken fails", async () => {
        getClientByLoginMock.mockResolvedValue(Result.success(clientData));
        getTokenMock.mockResolvedValue(Result.success(internalToken));
        postMock.mockResolvedValue({ status: 200, data: refreshResponse });
        prepareTokenMock.mockReturnValue(internalToken);
        saveTokenMock.mockResolvedValue(Result.error(new Error("save failed")));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toContain("Failed to save refreshed token: save failed");
    });
});
