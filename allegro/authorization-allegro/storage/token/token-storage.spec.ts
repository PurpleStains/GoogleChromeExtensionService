import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { getToken, saveToken, __setTokensDbContextForTests, __resetTokensDbContextForTests } from './token-storage.js';
import { Timestamp } from '@google-cloud/firestore';
import { AllegroTokenInternal } from '../../../../src/infrastructure/allegro/allegro.types.js';

describe('token-storage', () => {

    const mockClientLogin = 'test-client';
    const mockToken: AllegroTokenInternal = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: new Timestamp(1000, 0)
    };

    const mockDocSnapshotEmpty = {
        exists: false,
        data: () => undefined,
    };

    const mockFirestoreEmpty = {
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(mockDocSnapshotEmpty), set: jest.fn() }),
    };

    const mockDocSnapshot = {
        exists: true,
        data: () => ({ [mockClientLogin]: mockToken, set: jest.fn(), }),
    };

    const mockFirestore = {
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(mockDocSnapshot), set: jest.fn() }),
    };

    const mockDocSnapshotFailure = {
        exists: false,
        data: () => ({ [mockClientLogin]: mockToken }),
    };

    const mockFirestoreFailure = {
        doc: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue(mockDocSnapshotFailure),
            set: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Failed to connect to the database while saving token')),
        }),
    };

    const mockDocOtherClient = {
        exists: true,
        data: () => ({ 'other-client': mockToken }),
    };
    const mockFirestoreOtherClient = {
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(mockDocOtherClient as any) })
    };


    beforeEach(() => {
        jest.clearAllMocks();
        __resetTokensDbContextForTests();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getToken', () => {
        it('should successfully retrieve token when it exists', async () => {
            __setTokensDbContextForTests(() => mockFirestore as any);

            const result = await getToken(mockClientLogin);

            expect(result.isSuccess()).toBe(true);
            expect(result.getValue()).toEqual(mockToken);
            expect(mockFirestore.doc).toHaveBeenCalledWith('tokens-list');
        });

        it('should return error when clientLogin is empty', async () => {
            const result = await getToken('');

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Client login is required for token retrieval');
        });

        it('should return error when database connection fails', async () => {
            __setTokensDbContextForTests(() => null as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Failed to connect to the database while getting token');
        });

        it('should return error when document does not exist', async () => {
            __setTokensDbContextForTests(() => mockFirestoreFailure as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Tokens list does not exist');
        });

        it('should return error when token for client does not exist', async () => {
            __setTokensDbContextForTests(() => mockFirestoreOtherClient as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Token for client does not exist');
        });

        it('should return error when exception occurs', async () => {
            const mockFirestore = {
                doc: jest.fn().mockReturnValue({ get: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Database error')) }),
            };
            __setTokensDbContextForTests(() => mockFirestore as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Database error');
        });
    });

    describe('saveToken', () => {
        it('should successfully save token when document does not exist', async () => {
            __setTokensDbContextForTests(() => mockFirestoreEmpty as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isSuccess()).toBe(true);
        });

        it('should successfully save token when document exists but token does not', async () => {
            __setTokensDbContextForTests(() => mockFirestoreEmpty as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isSuccess()).toBe(true);
        });

        it('should return error when clientLogin is empty', async () => {
            const result = await saveToken('', mockToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Client login is required for token saving');
        });

        it('should return error when token is null', async () => {
            const result = await saveToken(mockClientLogin, null as any);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Invalid token data');
        });

        it('should return error when token is missing accessToken', async () => {
            const invalidToken = { ...mockToken, accessToken: '' };

            const result = await saveToken(mockClientLogin, invalidToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Invalid token data');
        });

        it('should return error when token is missing refreshToken', async () => {
            const invalidToken = { ...mockToken, refreshToken: '' };

            const result = await saveToken(mockClientLogin, invalidToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Invalid token data');
        });

        it('should return error when token is missing expiresIn', async () => {
            const invalidToken = { ...mockToken, expiresIn: null as any };

            const result = await saveToken(mockClientLogin, invalidToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Invalid token data');
        });

        it('should return error when database connection fails', async () => {
            __setTokensDbContextForTests(() => null as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Failed to connect to the database while saving token');
        });

        it('should return error when exception occurs during save', async () => {
            __setTokensDbContextForTests(() => mockFirestoreFailure as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Failed to connect to the database while saving token');
        });
    });
});
