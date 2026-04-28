import { Result } from "../../shared/patterns/result-pattern.js";
import { CatalogData } from "../../infrastructure/allegro/allegro.types.js";

export interface ICatalogsRepository {
    findByNip(nip: string): Promise<Result<CatalogData | null>>;
    findAll(): Promise<Result<CatalogData[]>>;
    markAsSent(nip: string): Promise<Result<CatalogData>>;
    markAsUnsent(nip: string): Promise<Result<CatalogData>>;
}
