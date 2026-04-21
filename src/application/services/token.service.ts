import { Result } from "../../shared/patterns/result-pattern.js";
import { AllegroTokenInternal } from "../../infrastructure/allegro/allegro.types.js";
import { getToken } from "../../infrastructure/allegro/repositories/firestore-tokens.repository.js";
import { isTokenExpired, prepareToken } from "../../infrastructure/allegro/utils/token.utils.js";
import { refreshAndSaveToken } from "./token-refresh.service.js";

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
                new Error(`Failed to refresh token for client ${clientLogin} ${refreshTokenResult.getError()?.message}`)
            );
        }

        const tokenResponse = refreshTokenResult.getValue();
        validToken = prepareToken(tokenResponse!);
    }

    return Result.success(validToken);
};
