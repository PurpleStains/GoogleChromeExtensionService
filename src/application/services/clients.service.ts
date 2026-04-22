import { ClientData, ClientsResponse } from "../../infrastructure/allegro/allegro.types.js";
import { IClientsRepository } from "../../domain/repositories/clients.repository.js";
import { FirestoreClientsRepository } from "../../infrastructure/allegro/repositories/firestore-clients.repository.js";
import { Result } from "../../shared/patterns/result-pattern.js";

export class ClientsService {
    constructor(private readonly clientsRepository: IClientsRepository) { }

    getClientByLogin(allegroLogin: string): Promise<Result<ClientData>> {
        return this.clientsRepository.findByLogin(allegroLogin);
    }

    getClients(): Promise<Result<ClientsResponse>> {
        return this.clientsRepository.findAllWithAuthorizationStatus();
    }

    createClient(client: ClientData): Promise<Result<ClientData>> {
        return this.clientsRepository.create(client);
    }

    setClientAuthorizationStatus(clientLogin: string, isAuthorized: boolean): Promise<Result<void>> {
        return this.clientsRepository.updateAuthorizationStatus(clientLogin, isAuthorized);
    }
}

export const clientsService = new ClientsService(new FirestoreClientsRepository());