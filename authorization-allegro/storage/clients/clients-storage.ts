import { Firestore } from "@google-cloud/firestore";
import { ClientData } from "../../types/client.type.js";
import { Result } from "../../../shared/result-pattern.js";
import { ClientResponse, ClientsResponse } from "../../../allegro-clients/types/index.js";

const projectId = process.env.GC_PROJECT_ID || "";
const catalogsId = process.env.FIRESTORE_DATABASE || "";

const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
const firestoreDb = db.collection(catalogsId);
const CLIENTS_DOC_ID = "clients-list";

export const GetClient = async (allegroLogin: string): Promise<Result<ClientData>> => {
    try {
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
        const doc = await firestoreDb.doc(CLIENTS_DOC_ID).get();
        if (!doc.exists) {
            return Result.error(new Error("Clients list does not exist"));
        }

        const clients = doc.data() as Record<string, ClientData>;
        const clientLogins = Object.keys(clients);

        const response: ClientsResponse = {
            clients: clientLogins.map(login => ({ clientLogin: login }))
        };

        return Result.success(response);
    } catch (err) {
        return Result.error(err as Error);
    }
}

export const CreateClient = async (client: ClientData): Promise<Result<ClientData>> => {
    try {
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