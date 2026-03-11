import { Result } from "../../../../shared/result-pattern.js";
import { AllegroTokenInternal } from "../../types/token.type.js";
import { getToken } from "./token-storage.js";
import { isTokenExpired, prepareToken } from "./token.utils.js";
import { refreshAndSaveToken } from "../../refresh-token/refresh-token.js";

export const getValidToken = async (clientLogin: string): Promise<Result<AllegroTokenInternal>> => {
    const getTokenResult = await getToken(clientLogin);
    if (getTokenResult.isFailure()) {
        return Result.error(new Error(`Failed to retrieve existing token for client ${clientLogin}`));
    }

    const existingToken = getTokenResult.getValue();
    if (!existingToken) {
        return Result.error(new Error(`No existing token found for client ${clientLogin}`));
    }

    let validToken = existingToken;
    if (isTokenExpired(existingToken)) {
        const refreshTokenResult = await refreshAndSaveToken(clientLogin);
        if (refreshTokenResult.isFailure()) {
            return Result.error(
                new Error(`Failed to refresh token for client ${clientLogin} ${refreshTokenResult.getError()?.message}`));
        }

        const tokenResponse = refreshTokenResult.getValue();
        validToken = prepareToken(tokenResponse!);
    }

    return Result.success(validToken);
}