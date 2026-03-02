export type AllegroTokenResponse = {
    access_token: string,
    allegro_api: boolean,
    expires_in: number,
    iss: string,
    refresh_token: string;
}

export type AllegroTokenInternal = {
    accessToken: string;
    refreshToken: string;
    expiresIn: Date;
}

export type TokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}