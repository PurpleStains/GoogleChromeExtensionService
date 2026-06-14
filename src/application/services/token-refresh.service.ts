import { Result } from "../../shared/patterns/result-pattern.js";
import { AllegroTokenResponse } from "../../infrastructure/allegro/allegro.types.js";
import { allegroAxiosInstance } from "../../infrastructure/allegro/allegro.client.js";
import { clientsService } from "./clients.service.js";
import { getToken, saveToken } from "../../infrastructure/allegro/repositories/firestore-tokens.repository.js";
import { prepareToken } from "../../infrastructure/allegro/utils/token.utils.js";
import { logger } from "../../shared/logger.js";

const inFlightRefreshes = new Map<string, Promise<Result<AllegroTokenResponse>>>();

const executeRefresh = async (clientLogin: string): Promise<Result<AllegroTokenResponse>> => {
    logger.info('Refreshing token', { clientLogin });
    const clientResult = await clientsService.getClientByLogin(clientLogin);
    if (clientResult.isFailure()) {
        return Result.error(new Error(clientResult.getError()?.message));
    }

    const clientData = clientResult.getValue();
    if (!clientData) {
        return Result.error(new Error(`Client data not found for login: ${clientLogin}`));
    }

    const token = await getToken(clientLogin);
    if (token.isFailure()) {
        return Result.error(new Error(`Token not found for the provided client login: ${clientLogin}`));
    }

    const credentials = Buffer.from(`${clientData.clientId}:${clientData.clientSecret}`).toString("base64");
    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.getValue()?.refreshToken ?? "",
    });


    const httpClient = allegroAxiosInstance(credentials, clientData.userAgent);
    const response = await httpClient.post("auth/oauth/token", params.toString());
    if (!response.status || response.status >= 400) {
        logger.error('Token refresh HTTP request failed', { clientLogin, status: response.status });
        return Result.error(new Error("Failed to refresh token"));
    }

    const refreshToken = response.data as AllegroTokenResponse;
    const internalToken = prepareToken(refreshToken);

    const saveFreshToken = await saveToken(clientData.clientLogin, internalToken);
    if (saveFreshToken.isFailure()) {
        logger.error('Failed to save refreshed token', { clientLogin, error: saveFreshToken.getError()?.message });
        return Result.error(new Error(`Failed to save refreshed token: ${saveFreshToken.getError()?.message}`));
    }

    logger.info('Token refreshed successfully', { clientLogin });
    return Result.success(refreshToken);
};

export const refreshAndSaveToken = (clientLogin: string): Promise<Result<AllegroTokenResponse>> => {
    const existing = inFlightRefreshes.get(clientLogin);
    if (existing) return existing;

    const promise = executeRefresh(clientLogin).finally(() => {
        inFlightRefreshes.delete(clientLogin);
    });

    inFlightRefreshes.set(clientLogin, promise);
    return promise;
};
