import { AllegroTokenInternal } from "../../../../src/infrastructure/allegro/allegro.types.js";
import { tokensFirestoreDatabaseContext } from "../../../../src/infrastructure/database/index.js";
import { Result } from "../../../../src/shared/index.js";

const TOKENS_ID = "tokens-list";
let getTokensDbContext = tokensFirestoreDatabaseContext;

export const __setTokensDbContextForTests = (contextProvider: typeof tokensFirestoreDatabaseContext): void => {
    getTokensDbContext = contextProvider;
};

export const __resetTokensDbContextForTests = (): void => {
    getTokensDbContext = tokensFirestoreDatabaseContext;
};

export const clearTokens = async (): Promise<Result<void>> => {
    try {
        const firestoreDb = getTokensDbContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while clearing tokens"));
        }

        await firestoreDb.doc(TOKENS_ID).delete();

        return Result.success();
    } catch (err) {
        return Result.error(err as Error);
    }
}

export const getToken = async (clientLogin: string): Promise<Result<AllegroTokenInternal>> => {
    try {
        if (!clientLogin) {
            return Result.error(new Error("Client login is required for token retrieval"));
        }

        const firestoreDb = getTokensDbContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while getting token"));
        }

        const doc = await firestoreDb.doc(TOKENS_ID).get();

        if (!doc.exists) {
            return Result.error(new Error("Tokens list does not exist"));
        }

        const tokens = doc.data() as Record<string, AllegroTokenInternal>;
        const tokenData = tokens[clientLogin];

        if (!tokenData) {
            return Result.error(new Error("Token for client does not exist"));
        }

        return Result.success(tokenData);
    } catch (err) {
        return Result.error(err as Error);
    }
}

export const saveToken = async (clientLogin: string, token: AllegroTokenInternal): Promise<Result<void>> => {
    try {
        if (!clientLogin) {
            return Result.error(new Error("Client login is required for token saving"));
        }

        if (!token || !token.accessToken || !token.refreshToken || !token.expiresIn) {
            return Result.error(new Error("Invalid token data"));
        }

        const firestoreDb = getTokensDbContext();
        if (!firestoreDb) {
            return Result.error(new Error("Failed to connect to the database while saving token"));
        }

        const doc = await firestoreDb.doc(TOKENS_ID).get();
        const tokens = doc.exists ? (doc.data() as Record<string, AllegroTokenInternal>) : {};

        tokens[clientLogin] = token;
        await firestoreDb.doc(TOKENS_ID).set(tokens);

        return Result.success();
    } catch (err) {
        return Result.error(err as Error);
    }
}