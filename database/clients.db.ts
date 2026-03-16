import { CollectionReference, Firestore } from "@google-cloud/firestore";

const CLIENTS_DB_COLLECTION = "clients";
export const clientsFirestoreDatabaseContext = (): CollectionReference => {
    const projectId = process.env.GC_PROJECT_ID || "";
    const catalogsId = process.env.FIRESTORE_DATABASE || "";

    const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
    const firestoreDb = db.collection(CLIENTS_DB_COLLECTION);
    return firestoreDb;
}