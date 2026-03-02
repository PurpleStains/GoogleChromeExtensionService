import { CollectionReference, Firestore } from "@google-cloud/firestore";

export const firestoreDatabaseContext = (): CollectionReference => {
    const projectId = process.env.GC_PROJECT_ID || "";
    const catalogsId = process.env.FIRESTORE_DATABASE || "";

    const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
    const firestoreDb = db.collection(catalogsId);
    return firestoreDb;
}