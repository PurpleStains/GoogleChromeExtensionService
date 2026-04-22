import { Result } from "../../shared/patterns/result-pattern.js";
import { ClientData, ClientsResponse } from "../../infrastructure/allegro/allegro.types.js";

export interface IClientsRepository {
    findByLogin(allegroLogin: string): Promise<Result<ClientData>>;
    findAllWithAuthorizationStatus(): Promise<Result<ClientsResponse>>;
    create(client: ClientData): Promise<Result<ClientData>>;
    updateAuthorizationStatus(clientLogin: string, isAuthorized: boolean): Promise<Result<void>>;
}