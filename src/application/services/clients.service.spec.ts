import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Result } from "../../shared/patterns/result-pattern.js";
import { ClientsService } from "./clients.service.js";
import { ClientData } from "../../infrastructure/allegro/allegro.types.js";
import { IClientsRepository } from "../../domain/repositories/clients.repository.js";

describe("ClientsService", () => {
    const sampleClient: ClientData = {
        clientLogin: "client-1",
        clientId: "id-1",
        clientSecret: "secret-1",
        isAuthorized: true,
        userAgent: "TestAgent/1.0",
    };

    const repositoryMock: jest.Mocked<IClientsRepository> = {
        findByLogin: jest.fn(),
        findAllWithAuthorizationStatus: jest.fn(),
        create: jest.fn(),
        updateAuthorizationStatus: jest.fn(),
    };

    let service: ClientsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ClientsService(repositoryMock);
    });

    it("getClientByLogin should delegate to repository and return success", async () => {
        repositoryMock.findByLogin.mockResolvedValue(Result.success(sampleClient));

        const result = await service.getClientByLogin(sampleClient.clientLogin);

        expect(repositoryMock.findByLogin).toHaveBeenCalledWith(sampleClient.clientLogin);
        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(sampleClient);
    });

    it("getClientByLogin should propagate repository failure", async () => {
        repositoryMock.findByLogin.mockResolvedValue(Result.error(new Error("client not found")));

        const result = await service.getClientByLogin("missing-client");

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("client not found");
    });

    it("getClients should return repository payload", async () => {
        const payload = { clients: [{ clientLogin: "c1", isAuthorized: false }] };
        repositoryMock.findAllWithAuthorizationStatus.mockResolvedValue(Result.success(payload));

        const result = await service.getClients();

        expect(repositoryMock.findAllWithAuthorizationStatus).toHaveBeenCalledTimes(1);
        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(payload);
    });

    it("createClient should call repository with client data", async () => {
        repositoryMock.create.mockResolvedValue(Result.success(sampleClient));

        const result = await service.createClient(sampleClient);

        expect(repositoryMock.create).toHaveBeenCalledWith(sampleClient);
        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(sampleClient);
    });

    it("createClient should propagate duplicate client error", async () => {
        repositoryMock.create.mockResolvedValue(Result.error(new Error("Client already exists")));

        const result = await service.createClient(sampleClient);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Client already exists");
    });

    it("setClientAuthorizationStatus should call repository with provided status", async () => {
        repositoryMock.updateAuthorizationStatus.mockResolvedValue(Result.success());

        const result = await service.setClientAuthorizationStatus("client-1", false);

        expect(repositoryMock.updateAuthorizationStatus).toHaveBeenCalledWith("client-1", false);
        expect(result.isSuccess()).toBe(true);
    });

    it("setClientAuthorizationStatus should propagate repository failure", async () => {
        repositoryMock.updateAuthorizationStatus.mockResolvedValue(Result.error(new Error("Client does not exist")));

        const result = await service.setClientAuthorizationStatus("missing-client", true);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Client does not exist");
    });
});
