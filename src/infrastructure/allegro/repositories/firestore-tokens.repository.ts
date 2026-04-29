import { tokensFirestoreDatabaseContext } from "../../database/firestore/tokens-context.js";
import { Result } from "../../../shared/patterns/result-pattern.js";
import { ITokensRepository } from "../../../domain/repositories/tokens.repository.js";
import { AllegroTokenInternal } from "../allegro.types.js";
import { logger } from "../../../shared/logger.js";

const TOKENS_ID = "tokens-list";

export class FirestoreTokensRepository implements ITokensRepository {
    async clear(): Promise<Result<void>> {
        try {
            const firestoreDb = tokensFirestoreDatabaseContext();
            if (!firestoreDb) {
                return Result.error(new Error("Failed to connect to the database while clearing tokens"));
            }

            await firestoreDb.doc(TOKENS_ID).delete();

            return Result.success();
        } catch (err) {
            logger.error('FirestoreTokensRepository.clear failed', { stack: (err as Error).stack });
            return Result.error(err as Error);
        }
    }

    async findByClientLogin(clientLogin: string): Promise<Result<AllegroTokenInternal>> {
        try {
            if (!clientLogin) {
                return Result.error(new Error("Client login is required for token retrieval"));
            }

            const firestoreDb = tokensFirestoreDatabaseContext();
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
            logger.error('FirestoreTokensRepository.findByClientLogin failed', { clientLogin, stack: (err as Error).stack });
            return Result.error(err as Error);
        }
    }

    async save(clientLogin: string, token: AllegroTokenInternal): Promise<Result<void>> {
        try {
            if (!clientLogin) {
                return Result.error(new Error("Client login is required for token saving"));
            }

            if (!token || !token.accessToken || !token.refreshToken || !token.expiresIn) {
                return Result.error(new Error("Invalid token data"));
            }

            const firestoreDb = tokensFirestoreDatabaseContext();
            if (!firestoreDb) {
                return Result.error(new Error("Failed to connect to the database while saving token"));
            }

            const doc = await firestoreDb.doc(TOKENS_ID).get();
            const tokens = doc.exists ? (doc.data() as Record<string, AllegroTokenInternal>) : {};

            tokens[clientLogin] = token;
            await firestoreDb.doc(TOKENS_ID).set(tokens);

            return Result.success();
        } catch (err) {
            logger.error('FirestoreTokensRepository.save failed', { clientLogin, stack: (err as Error).stack });
            return Result.error(err as Error);
        }
    }
}

const tokensRepository = new FirestoreTokensRepository();

export const clearTokens = (): Promise<Result<void>> => tokensRepository.clear();
export const getToken = (clientLogin: string): Promise<Result<AllegroTokenInternal>> =>
    tokensRepository.findByClientLogin(clientLogin);
export const saveToken = (clientLogin: string, token: AllegroTokenInternal): Promise<Result<void>> =>
    tokensRepository.save(clientLogin, token);
