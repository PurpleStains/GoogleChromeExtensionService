import { CollectionReference, Firestore } from "@google-cloud/firestore";

const TOKENS_DB_COLLECTION = "tokens";

export const tokensFirestoreDatabaseContext = (): CollectionReference => {
    const projectId = process.env.GC_PROJECT_ID || "";
    const catalogsId = process.env.FIRESTORE_DATABASE || "";

    const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
    const firestoreDb = db.collection(TOKENS_DB_COLLECTION);
    return firestoreDb;
};
