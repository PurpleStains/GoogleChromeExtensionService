import { getToken, saveToken } from "../storage/token/token-storage.js";
import { AllegroTokenResponse } from "../types/token.type.js";
import { GetClient } from "../storage/clients/clients-storage.js";
import { Result } from "../../../shared/result-pattern.js";
import { prepareToken } from "../storage/token/token.utils.js";

export const refreshAndSaveToken = async (clientLogin: string): Promise<Result<AllegroTokenResponse>> => {
    const clientResult = await GetClient(clientLogin as string);
    if (clientResult.isFailure()) {
        return Result.error(new Error(clientResult.getError()?.message));
    }
    const clientData = clientResult.getValue();
    if (!clientData) {
        return Result.error(new Error(`Client data not found for login: ${clientLogin}`));
    }

    const token = await getToken(clientLogin);
    if (!token) return Result.error(new Error(`Token not found for the provided client login: ${clientLogin}`));

    const credentials = Buffer.from(`${clientData?.clientId}:${clientData?.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.getValue()?.refreshToken ?? "",
    });

    const response = await fetch("https://allegro.pl/auth/oauth/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });

    const responseBody = await response.json();
    if (!response.ok) {
        console.log("Failed to refresh token, response:", responseBody);
        return Result.error(new Error(`Failed to refresh token`));
    }

    const refreshToken = responseBody as AllegroTokenResponse;
    const internalToken = prepareToken(refreshToken);

    const saveFreshToken = await saveToken(clientData.clientLogin, internalToken);
    if (saveFreshToken.isFailure()) {
        return Result.error(new Error(`Failed to save refreshed token: ${saveFreshToken.getError()?.message}`));
    }

    return Result.success(refreshToken);
}
