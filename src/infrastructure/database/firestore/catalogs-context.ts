import { CollectionReference, Firestore } from "@google-cloud/firestore";

export const catalogsFirestoreDatabaseContext = (): CollectionReference => {
    const projectId = process.env.GC_PROJECT_ID || "";
    const databaseId = process.env.FIRESTORE_DATABASE || "";

    const db = new Firestore({ projectId, databaseId });
    return db.collection(databaseId);
};
