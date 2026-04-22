import { Timestamp } from "@google-cloud/firestore";
import { AllegroTokenInternal, AllegroTokenResponse } from "../allegro.types.js";

export const prepareToken = (tokenResponse: AllegroTokenResponse): AllegroTokenInternal => {
    const expiresIn = new Timestamp(Math.floor((Date.now() + tokenResponse.expires_in * 1000) / 1000), 0);

    return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn,
    };
};

export const isTokenExpired = (token: AllegroTokenInternal): boolean => {
    const tokenExpiresInSeconds = token.expiresIn.seconds;
    const dateNowInSeconds = Math.floor(Date.now() / 1000);

    return tokenExpiresInSeconds <= dateNowInSeconds;
};
