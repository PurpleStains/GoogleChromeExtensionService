import { Result } from "../../shared/patterns/result-pattern.js";
import { AllegroTokenInternal } from "../../infrastructure/allegro/allegro.types.js";

export interface ITokensRepository {
    clear(): Promise<Result<void>>;
    findByClientLogin(clientLogin: string): Promise<Result<AllegroTokenInternal>>;
    save(clientLogin: string, token: AllegroTokenInternal): Promise<Result<void>>;
}
