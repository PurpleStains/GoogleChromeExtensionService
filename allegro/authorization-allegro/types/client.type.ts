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

