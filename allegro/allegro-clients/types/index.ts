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
