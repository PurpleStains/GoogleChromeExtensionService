import { AllegroTokenInternal, AllegroTokenResponse } from "../../types/token.type.js";

export const prepareToken = (tokenResponse: AllegroTokenResponse): AllegroTokenInternal => {
    const expiresIn = new Date(Date.now() + tokenResponse.expires_in * 1000);

    return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn,
    };
}