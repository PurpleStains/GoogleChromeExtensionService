import { clientsFirestoreDatabaseContext } from "../../database/firestore/clients-context.js";
import { getToken } from "./firestore-tokens.repository.js";
import { isTokenExpired } from "../utils/token.utils.js";
import { Result } from "../../../shared/patterns/result-pattern.js";
import { ClientData, ClientsResponse } from "../allegro.types.js";
import { IClientsRepository } from "../../../domain/repositories/clients.repository.js";

const CLIENTS_DOC_ID = "clients-list";

export class FirestoreClientsRepository implements IClientsRepository {
    async findByLogin(allegroLogin: string): Promise<Result<ClientData>> {
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

    async findAllWithAuthorizationStatus(): Promise<Result<ClientsResponse>> {
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
                            isAuthorized,
                        };
                    }

                    return {
                        clientLogin: login,
                        isAuthorized: false,
                    };
                })
            );

            return Result.success({ clients: clientsWithAuth });
        } catch (err) {
            return Result.error(err as Error);
        }
    }

    async create(client: ClientData): Promise<Result<ClientData>> {
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

    async updateAuthorizationStatus(clientLogin: string, isAuthorized: boolean): Promise<Result<void>> {
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
            clients[clientLogin] = {
                clientLogin: currentClientData.clientLogin,
                clientId: currentClientData.clientId,
                clientSecret: currentClientData.clientSecret,
                isAuthorized,
            };
            await firestoreDb.doc(CLIENTS_DOC_ID).set(clients);

            return Result.success();
        } catch (err) {
            return Result.error(err as Error);
        }
    }
}