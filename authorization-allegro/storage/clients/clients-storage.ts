import { ClientData, ClientDataUpdate } from "../../types/client.type.js";
import { Result } from "../../../shared/result-pattern.js";
import { ClientResponse, ClientsResponse } from "../../../allegro-clients/types/index.js";
import { clientsFirestoreDatabaseContext } from "../../../database/clients-repository.js";
import { get } from "http";
import { getToken } from "../token/token-storage.js";
import { isTokenExpired } from "../token/token.utils.js";

const CLIENTS_DOC_ID = "clients-list";

export const GetClient = async (allegroLogin: string): Promise<Result<ClientData>> => {
    try {
        const firestoreDb = clientsFirestoreDatabaseContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while getting client"));
        }
        const doc = await firestoreDb.doc(CLIENTS_DOC_ID).get();
        if (!doc.exists) {
            return Result.error(new Error("Clients list does not exist"));
        }

        const clients = doc.data() as Record<string, ClientData>;
        const clientData = clients[allegroLogin];

        if (!clientData) {
            return Result.error(new Error("Client does not exist"));
        }

        return Result.success(clientData);
    } catch (err) {
        return Result.error(err as Error);
    }
}

export const GetClients = async (): Promise<Result<ClientsResponse>> => {
    try {
        const firestoreDb = clientsFirestoreDatabaseContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while getting client"));
        }
        const doc = await firestoreDb.doc(CLIENTS_DOC_ID).get();
        if (!doc.exists) {
            return Result.error(new Error("Clients list does not exist"));
        }

        const clients = doc.data() as Record<string, ClientData>;
        const clientLogins = Object.keys(clients);

        const clientsWithAuth = await Promise.all(
            clientLogins.map(async (login) => {

                const tokenData = await getToken(login);
                if (tokenData.isSuccess()) {
                    const token = tokenData.getValue();
                    const isAuthorized = token ? !isTokenExpired(token) : false;
                    return {
                        clientLogin: login,
                        isAuthorized: isAuthorized,
                    };
                } else {
                    return {
                        clientLogin: login,
                        isAuthorized: false,
                    };
                }

            })
        );

        const response: ClientsResponse = { clients: clientsWithAuth };
        return Result.success(response);
    } catch (err) {
        return Result.error(err as Error);
    }
}

export const CreateClient = async (client: ClientData): Promise<Result<ClientData>> => {
    try {
        const firestoreDb = clientsFirestoreDatabaseContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while creating client"));
        }
        const doc = await firestoreDb.doc(CLIENTS_DOC_ID).get();
        const clients = doc.exists ? (doc.data() as Record<string, ClientData>) : {};

        if (clients[client.clientLogin]) {
            return Result.error(new Error("Client already exists"));
        }

        clients[client.clientLogin] = client;
        await firestoreDb.doc(CLIENTS_DOC_ID).set(clients);

        return Result.success(client);
    } catch (err) {
        return Result.error(err as Error);
    }
}

export const SetClientAuthorizationStatus = async (clientLogin: string, isAuthorized: boolean): Promise<Result<void>> => {
    try {
        const firestoreDb = clientsFirestoreDatabaseContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while updating client"));
        }
        const doc = await firestoreDb.doc(CLIENTS_DOC_ID).get();
        const clients = doc.exists ? (doc.data() as Record<string, ClientData>) : {};

        if (!clients[clientLogin]) {
            return Result.error(new Error("Client does not exist"));
        }
        const currentClientData = clients[clientLogin];
        const updatedClientData: ClientData = {
            clientLogin: currentClientData.clientLogin,
            clientId: currentClientData.clientId,
            clientSecret: currentClientData.clientSecret,
            isAuthorized: isAuthorized,
        };
        clients[clientLogin] = updatedClientData;
        await firestoreDb.doc(CLIENTS_DOC_ID).set(clients);

        return Result.success();
    } catch (err) {
        return Result.error(err as Error);
    }
}