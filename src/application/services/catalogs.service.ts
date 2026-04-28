import { ICatalogsRepository } from "../../domain/repositories/catalogs.repository.js";
import { FirestoreCatalogsRepository } from "../../infrastructure/allegro/repositories/firestore-catalogs.repository.js";
import { Result } from "../../shared/patterns/result-pattern.js";
import { CatalogData } from "../../infrastructure/allegro/allegro.types.js";

export class CatalogsService {
    constructor(private readonly catalogsRepository: ICatalogsRepository) { }

    getCatalogByNip(nip: string): Promise<Result<CatalogData | null>> {
        return this.catalogsRepository.findByNip(nip);
    }

    getAllCatalogs(): Promise<Result<CatalogData[]>> {
        return this.catalogsRepository.findAll();
    }

    markAsSent(nip: string): Promise<Result<CatalogData>> {
        return this.catalogsRepository.markAsSent(nip);
    }

    markAsUnsent(nip: string): Promise<Result<CatalogData>> {
        return this.catalogsRepository.markAsUnsent(nip);
    }
}

export const catalogsService = new CatalogsService(new FirestoreCatalogsRepository());
