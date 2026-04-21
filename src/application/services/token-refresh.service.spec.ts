import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../shared/patterns/result-pattern.js";
import { refreshAndSaveToken } from "./token-refresh.service.js";
import { clientsService } from "./clients.service.js";
import { getToken, saveToken } from "../../infrastructure/allegro/repositories/firestore-tokens.repository.js";
import { allegroAxiosInstance } from "../../infrastructure/allegro/allegro.client.js";
import { prepareToken } from "../../infrastructure/allegro/utils/token.utils.js";

jest.mock("./clients.service.js", () => ({
    clientsService: {
        getClientByLogin: jest.fn(),
    },
}));

jest.mock("../../infrastructure/allegro/repositories/firestore-tokens.repository.js", () => ({
    getToken: jest.fn(),
    saveToken: jest.fn(),
}));

jest.mock("../../infrastructure/allegro/allegro.client.js", () => ({
    allegroAxiosInstance: jest.fn(),
}));

jest.mock("../../infrastructure/allegro/utils/token.utils.js", () => ({
    prepareToken: jest.fn(),
}));

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

    beforeEach(() => {
        jest.clearAllMocks();
        postMock.mockReset();
        jest.mocked(allegroAxiosInstance).mockReturnValue({ post: postMock } as any);
    });

    it("should return success when token refresh flow succeeds", async () => {
        jest.mocked(clientsService.getClientByLogin).mockResolvedValue(Result.success(clientData));
        jest.mocked(getToken).mockResolvedValue(Result.success(internalToken));
        postMock.mockResolvedValue({ status: 200, data: refreshResponse });
        jest.mocked(prepareToken).mockReturnValue(internalToken);
        jest.mocked(saveToken).mockResolvedValue(Result.success());

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(refreshResponse);
        expect(allegroAxiosInstance).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith("auth/oauth/token", expect.stringContaining("grant_type=refresh_token"));
        expect(saveToken).toHaveBeenCalledWith(clientLogin, internalToken);
    });

    it("should fail when client lookup fails", async () => {
        jest.mocked(clientsService.getClientByLogin).mockResolvedValue(Result.error(new Error("missing client")));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("missing client");
    });

    it("should fail when client value is undefined", async () => {
        jest.mocked(clientsService.getClientByLogin).mockResolvedValue(Result.success(undefined as any));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe(`Client data not found for login: ${clientLogin}`);
    });

    it("should fail when stored token is missing", async () => {
        jest.mocked(clientsService.getClientByLogin).mockResolvedValue(Result.success(clientData));
        jest.mocked(getToken).mockResolvedValue(Result.error(new Error("token not found")));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe(`Token not found for the provided client login: ${clientLogin}`);
    });

    it("should fail when allegro responds with status >= 400", async () => {
        jest.mocked(clientsService.getClientByLogin).mockResolvedValue(Result.success(clientData));
        jest.mocked(getToken).mockResolvedValue(Result.success(internalToken));
        postMock.mockResolvedValue({ status: 400, data: { message: "bad request" } });

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to refresh token");
    });

    it("should fail when saveToken fails", async () => {
        jest.mocked(clientsService.getClientByLogin).mockResolvedValue(Result.success(clientData));
        jest.mocked(getToken).mockResolvedValue(Result.success(internalToken));
        postMock.mockResolvedValue({ status: 200, data: refreshResponse });
        jest.mocked(prepareToken).mockReturnValue(internalToken);
        jest.mocked(saveToken).mockResolvedValue(Result.error(new Error("save failed")));

        const result = await refreshAndSaveToken(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toContain("Failed to save refreshed token: save failed");
    });
});
