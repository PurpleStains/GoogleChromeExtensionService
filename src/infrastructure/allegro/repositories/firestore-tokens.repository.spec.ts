import { Timestamp } from "@google-cloud/firestore";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

const tokensFirestoreDatabaseContextMock = jest.fn();

jest.unstable_mockModule("../../database/firestore/tokens-context.js", () => ({
    tokensFirestoreDatabaseContext: tokensFirestoreDatabaseContextMock,
}));

let FirestoreTokensRepository: new () => {
    clear: () => Promise<any>;
    findByClientLogin: (clientLogin: string) => Promise<any>;
    save: (clientLogin: string, token: any) => Promise<any>;
};

describe("FirestoreTokensRepository", () => {
    let repository: InstanceType<typeof FirestoreTokensRepository>;
    const clientLogin = "client-1";
    const token = {
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: new Timestamp(1700000000, 0),
    };

    const createFirestoreMock = (options?: {
        exists?: boolean;
        data?: Record<string, unknown>;
        throwOnGet?: string;
        throwOnSet?: string;
        throwOnDelete?: string;
    }) => {
        const doc = {
            get: jest.fn(async () => {
                if (options?.throwOnGet) {
                    throw new Error(options.throwOnGet);
                }

                return {
                    exists: options?.exists ?? true,
                    data: () => options?.data,
                };
            }),
            set: jest.fn(async () => {
                if (options?.throwOnSet) {
                    throw new Error(options.throwOnSet);
                }
            }),
            delete: jest.fn(async () => {
                if (options?.throwOnDelete) {
                    throw new Error(options.throwOnDelete);
                }
            }),
        };

        return {
            doc: jest.fn(() => doc),
            _doc: doc,
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new FirestoreTokensRepository();
    });

    beforeAll(async () => {
        ({ FirestoreTokensRepository } = await import("./firestore-tokens.repository.js"));
    });

    it("clear should return success when delete succeeds", async () => {
        const firestore = createFirestoreMock();
        tokensFirestoreDatabaseContextMock.mockReturnValue(firestore as any);

        const result = await repository.clear();

        expect(result.isSuccess()).toBe(true);
        expect(firestore.doc).toHaveBeenCalledTimes(1);
        expect((firestore.doc as any).mock.calls[0][0]).toBe("tokens-list");
        expect(firestore._doc.delete).toHaveBeenCalledTimes(1);
    });

    it("clear should return error when db context is missing", async () => {
        tokensFirestoreDatabaseContextMock.mockReturnValue(null as any);

        const result = await repository.clear();

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Failed to connect to the database while clearing tokens");
    });

    it("findByClientLogin should return token when present", async () => {
        const firestore = createFirestoreMock({
            exists: true,
            data: { [clientLogin]: token },
        });
        tokensFirestoreDatabaseContextMock.mockReturnValue(firestore as any);

        const result = await repository.findByClientLogin(clientLogin);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(token);
    });

    it("findByClientLogin should validate empty client login", async () => {
        const result = await repository.findByClientLogin("");

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Client login is required for token retrieval");
    });

    it("findByClientLogin should return error when token list doc does not exist", async () => {
        const firestore = createFirestoreMock({ exists: false });
        tokensFirestoreDatabaseContextMock.mockReturnValue(firestore as any);

        const result = await repository.findByClientLogin(clientLogin);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Tokens list does not exist");
    });

    it("save should persist token and return success", async () => {
        const firestore = createFirestoreMock({ exists: true, data: {} });
        tokensFirestoreDatabaseContextMock.mockReturnValue(firestore as any);

        const result = await repository.save(clientLogin, token);

        expect(result.isSuccess()).toBe(true);
        expect(firestore._doc.set).toHaveBeenCalledTimes(1);
        expect((firestore._doc.set as any).mock.calls[0][0]).toEqual({ [clientLogin]: token });
    });

    it("save should return error for invalid token", async () => {
        const result = await repository.save(clientLogin, {
            ...token,
            accessToken: "",
        });

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("Invalid token data");
    });

    it("save should return propagated error when set throws", async () => {
        const firestore = createFirestoreMock({
            exists: true,
            data: {},
            throwOnSet: "set failed",
        });
        tokensFirestoreDatabaseContextMock.mockReturnValue(firestore as any);

        const result = await repository.save(clientLogin, token);

        expect(result.isFailure()).toBe(true);
        expect(result.getError()?.message).toBe("set failed");
    });
});
