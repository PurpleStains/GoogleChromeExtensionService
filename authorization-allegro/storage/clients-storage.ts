import { Firestore } from "@google-cloud/firestore";
import { ClientData } from "../types/index.js";

const projectId = process.env.GC_PROJECT_ID || "";
const catalogsId = process.env.FIRESTORE_DATABASE || "";

const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
const firestoreDb = db.collection(catalogsId);

export const GetClient = async (allegroLogin: string) => {
    try {
        const doc = await firestoreDb.doc(allegroLogin).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data();
    } catch (err) {
        console.error("Error fetching client:", err);
        throw new Error("Failed to fetch client");
    }
}

export const SaveClient = async (client: ClientData) => {
    try {
        const doc = await firestoreDb.doc(client.clientLogin).set(client, { merge: true });
        return client;
    } catch (err) {
        console.error("Error saving client:", err);
        throw new Error("Failed to save client");
    }
}