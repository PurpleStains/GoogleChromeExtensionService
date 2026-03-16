import { Timestamp } from "@google-cloud/firestore";

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
    expiresIn: Timestamp;
}

export type TokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export type AllegroClient = {
    clientLogin: string;
}

export type ClientResponse = {
    clientLogin: string;
    isAuthorized: boolean;
}

export type ClientsResponse = {
    clients: ClientResponse[];
}

export type ClientData = {
    clientLogin: string;
    clientId: string;
    clientSecret: string;
    isAuthorized?: boolean;
}

export type ClientDataUpdate = {
    clientLogin: string;
    isAuthorized: boolean;
}

