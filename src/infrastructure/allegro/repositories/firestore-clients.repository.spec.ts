import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Timestamp } from "@google-cloud/firestore";
import { Result } from "../../../shared/patterns/result-pattern.js";
import { AllegroTokenInternal, ClientData } from "../allegro.types.js";

const getMock = jest.fn<() => Promise<{ exists: boolean; data?: () => Record<string, ClientData> }>>();
const setMock = jest.fn<(data: Record<string, ClientData>) => Promise<void>>();
const docMock = jest.fn<() => { get: typeof getMock; set: typeof setMock }>(() => ({ get: getMock, set: setMock }));
const firestoreContextMock = jest.fn<() => { doc: typeof docMock } | null>(() => ({ doc: docMock }));
const getTokenMock = jest.fn<(login: string) => Promise<Result<AllegroTokenInternal>>>();
const isTokenExpiredMock = jest.fn<(token: AllegroTokenInternal) => boolean>();
const loggerErrorMock = jest.fn<(message: string, meta?: unknown) => void>();

jest.unstable_mockModule("../../database/firestore/clients-context.js", () => ({
    clientsFirestoreDatabaseContext: firestoreContextMock,
}));

jest.unstable_mockModule("./firestore-tokens.repository.js", () => ({
    getToken: getTokenMock,
}));

jest.unstable_mockModule("../utils/token.utils.js", () => ({
    isTokenExpired: isTokenExpiredMock,
}));

jest.unstable_mockModule("../../../shared/logger.js", () => ({
    logger: { error: loggerErrorMock },
}));

const sampleClient: ClientData = {
    clientLogin: "client-1",
    clientId: "id-1",
    clientSecret: "secret-1",
    isAuthorized: true,
    userAgent: "TestAgent/1.0",
};

const sampleToken: AllegroTokenInternal = {
    accessToken: "tok",
    refreshToken: "refresh",
    expiresIn: Timestamp.fromMillis(Date.now() + 60_000),
};

describe("FirestoreClientsRepository", () => {
    let repository: import("./firestore-clients.repository.js").FirestoreClientsRepository;

    beforeEach(async () => {
        jest.clearAllMocks();
        const { FirestoreClientsRepository } = await import("./firestore-clients.repository.js");
        repository = new FirestoreClientsRepository();
    });

    describe("findByLogin", () => {
        it("should return client data when client exists", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({ "client-1": sampleClient }) });

            const result = await repository.findByLogin("client-1");

            expect(result.isSuccess()).toBe(true);
            expect(result.getValue()).toEqual(sampleClient);
        });

        it("should return error when db connection fails", async () => {
            firestoreContextMock.mockReturnValueOnce(null);

            const result = await repository.findByLogin("client-1");

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Failed to connect to the database while getting client");
        });

        it("should return error when clients document does not exist", async () => {
            getMock.mockResolvedValue({ exists: false });

            const result = await repository.findByLogin("client-1");

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Clients list does not exist");
        });

        it("should return error when client login is not in the document", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({}) });

            const result = await repository.findByLogin("missing-client");

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Client does not exist");
        });

        it("should return error and log when an exception is thrown", async () => {
            getMock.mockRejectedValue(new Error("Firestore unavailable"));

            const result = await repository.findByLogin("client-1");

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Firestore unavailable");
            expect(loggerErrorMock).toHaveBeenCalledTimes(1);
        });
    });

    describe("findAllWithAuthorizationStatus", () => {
        it("should return clients with authorized=true when token is valid", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({ "client-1": sampleClient }) });
            getTokenMock.mockResolvedValue(Result.success(sampleToken));
            isTokenExpiredMock.mockReturnValue(false);

            const result = await repository.findAllWithAuthorizationStatus();

            expect(result.isSuccess()).toBe(true);
            expect(result.getValue()).toEqual({ clients: [{ clientLogin: "client-1", isAuthorized: true }] });
        });

        it("should return clients with authorized=false when token is expired", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({ "client-1": sampleClient }) });
            getTokenMock.mockResolvedValue(Result.success(sampleToken));
            isTokenExpiredMock.mockReturnValue(true);

            const result = await repository.findAllWithAuthorizationStatus();

            expect(result.isSuccess()).toBe(true);
            expect(result.getValue()).toEqual({ clients: [{ clientLogin: "client-1", isAuthorized: false }] });
        });

        it("should return clients with authorized=false when getToken fails", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({ "client-1": sampleClient }) });
            getTokenMock.mockResolvedValue(Result.error(new Error("no token")));

            const result = await repository.findAllWithAuthorizationStatus();

            expect(result.isSuccess()).toBe(true);
            expect(result.getValue()).toEqual({ clients: [{ clientLogin: "client-1", isAuthorized: false }] });
        });

        it("should return error when db connection fails", async () => {
            firestoreContextMock.mockReturnValueOnce(null);

            const result = await repository.findAllWithAuthorizationStatus();

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Failed to connect to the database while getting client");
        });

        it("should return error when clients document does not exist", async () => {
            getMock.mockResolvedValue({ exists: false });

            const result = await repository.findAllWithAuthorizationStatus();

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Clients list does not exist");
        });

        it("should return error and log when an exception is thrown", async () => {
            getMock.mockRejectedValue(new Error("Firestore unavailable"));

            const result = await repository.findAllWithAuthorizationStatus();

            expect(result.isFailure()).toBe(true);
            expect(loggerErrorMock).toHaveBeenCalledTimes(1);
        });
    });

    describe("create", () => {
        it("should persist and return the client when it does not exist yet", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({}) });
            setMock.mockResolvedValue(undefined);

            const result = await repository.create(sampleClient);

            expect(result.isSuccess()).toBe(true);
            expect(result.getValue()).toEqual(sampleClient);
            expect(setMock).toHaveBeenCalledWith({ "client-1": sampleClient });
        });

        it("should create clients document from scratch when it does not exist", async () => {
            getMock.mockResolvedValue({ exists: false });
            setMock.mockResolvedValue(undefined);

            const result = await repository.create(sampleClient);

            expect(result.isSuccess()).toBe(true);
            expect(setMock).toHaveBeenCalledWith({ "client-1": sampleClient });
        });

        it("should return error when client already exists", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({ "client-1": sampleClient }) });

            const result = await repository.create(sampleClient);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Client already exists");
            expect(setMock).not.toHaveBeenCalled();
        });

        it("should return error when db connection fails", async () => {
            firestoreContextMock.mockReturnValueOnce(null);

            const result = await repository.create(sampleClient);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Failed to connect to the database while creating client");
        });

        it("should return error and log when an exception is thrown", async () => {
            getMock.mockRejectedValue(new Error("Firestore unavailable"));

            const result = await repository.create(sampleClient);

            expect(result.isFailure()).toBe(true);
            expect(loggerErrorMock).toHaveBeenCalledTimes(1);
        });
    });

    describe("updateAuthorizationStatus", () => {
        it("should update isAuthorized and preserve all other fields including userAgent", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({ "client-1": sampleClient }) });
            setMock.mockResolvedValue(undefined);

            const result = await repository.updateAuthorizationStatus("client-1", false);

            expect(result.isSuccess()).toBe(true);
            expect(setMock).toHaveBeenCalledWith({
                "client-1": {
                    clientLogin: "client-1",
                    clientId: "id-1",
                    clientSecret: "secret-1",
                    isAuthorized: false,
                    userAgent: "TestAgent/1.0",
                },
            });
        });

        it("should return error when client does not exist", async () => {
            getMock.mockResolvedValue({ exists: true, data: () => ({}) });

            const result = await repository.updateAuthorizationStatus("missing-client", true);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Client does not exist");
            expect(setMock).not.toHaveBeenCalled();
        });

        it("should return error when db connection fails", async () => {
            firestoreContextMock.mockReturnValueOnce(null);

            const result = await repository.updateAuthorizationStatus("client-1", true);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe("Failed to connect to the database while updating client");
        });

        it("should return error and log when an exception is thrown", async () => {
            getMock.mockRejectedValue(new Error("Firestore unavailable"));

            const result = await repository.updateAuthorizationStatus("client-1", true);

            expect(result.isFailure()).toBe(true);
            expect(loggerErrorMock).toHaveBeenCalledTimes(1);
        });
    });
});
