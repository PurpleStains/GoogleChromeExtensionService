import { FieldValue } from "@google-cloud/firestore";
import { catalogsFirestoreDatabaseContext } from "../../database/firestore/catalogs-context.js";
import { Result } from "../../../shared/patterns/result-pattern.js";
import { CatalogData } from "../allegro.types.js";
import { ICatalogsRepository } from "../../../domain/repositories/catalogs.repository.js";

export class FirestoreCatalogsRepository implements ICatalogsRepository {
    async findByNip(nip: string): Promise<Result<CatalogData | null>> {
        try {
            const firestoreDb = catalogsFirestoreDatabaseContext();
            const doc = await firestoreDb.doc(nip).get();
            if (!doc.exists) return Result.success(null);
            return Result.success(doc.data() as CatalogData);
        } catch (err) {
            return Result.error(err as Error);
        }
    }

    async findAll(): Promise<Result<CatalogData[]>> {
        try {
            const firestoreDb = catalogsFirestoreDatabaseContext();
            const snapshot = await firestoreDb.get();
            const catalogs: CatalogData[] = [];
            snapshot.forEach(doc => {
                catalogs.push({ nip: doc.id, ...doc.data() } as CatalogData);
            });
            return Result.success(catalogs);
        } catch (err) {
            return Result.error(err as Error);
        }
    }

    async markAsSent(nip: string): Promise<Result<CatalogData>> {
        try {
            const firestoreDb = catalogsFirestoreDatabaseContext();
            await firestoreDb.doc(nip).set(
                { nip, hasSend: true, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() },
                { merge: true }
            );
            const updated = await firestoreDb.doc(nip).get();
            return Result.success(updated.data() as CatalogData);
        } catch (err) {
            return Result.error(err as Error);
        }
    }

    async markAsUnsent(nip: string): Promise<Result<CatalogData>> {
        try {
            const firestoreDb = catalogsFirestoreDatabaseContext();
            await firestoreDb.doc(nip).set(
                { nip, hasSend: false, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() },
                { merge: true }
            );
            const updated = await firestoreDb.doc(nip).get();
            return Result.success(updated.data() as CatalogData);
        } catch (err) {
            return Result.error(err as Error);
        }
    }
}
