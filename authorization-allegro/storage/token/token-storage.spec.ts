import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getToken, saveToken } from './token-storage.js';
import { AllegroTokenInternal } from '../../types/token.type.js';
import { firestoreDatabaseContext } from '../../../database/dbcontext.js';
import { after } from 'node:test';

jest.mock('../../../database/dbcontext.js', () => ({
    firestoreDatabaseContext: jest.fn(),
}));

describe('token-storage', () => {

    const mockClientLogin = 'test-client';
    const mockToken: AllegroTokenInternal = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: new Date('2026-03-02T13:00:00.000Z')
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
            set: jest.fn().mockReturnValue(Promise.reject(new Error('Failed to connect to the database while saving token'))),
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
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getToken', () => {
        it('should successfully retrieve token when it exists', async () => {
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestore as any);

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
            jest.mocked(firestoreDatabaseContext).mockReturnValue(null as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Failed to connect to the database while getting token');
        });

        it('should return error when document does not exist', async () => {
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestoreFailure as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Tokens list does not exist');
        });

        it('should return error when token for client does not exist', async () => {
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestoreOtherClient as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Token for client does not exist');
        });

        it('should return error when exception occurs', async () => {
            const mockFirestore = {
                doc: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(Promise.reject(new Error('Database error'))) }),
            };
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestore as any);

            const result = await getToken(mockClientLogin);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Database error');
        });
    });

    describe('saveToken', () => {
        it('should successfully save token when document does not exist', async () => {
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestoreEmpty as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isSuccess()).toBe(true);
        });

        it('should successfully save token when document exists but token does not', async () => {
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestoreEmpty as any);

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
            jest.mocked(firestoreDatabaseContext).mockReturnValue(null as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Failed to connect to the database while saving token');
        });

        it('should return error when exception occurs during save', async () => {
            jest.mocked(firestoreDatabaseContext).mockReturnValue(mockFirestoreFailure as any);

            const result = await saveToken(mockClientLogin, mockToken);

            expect(result.isFailure()).toBe(true);
            expect(result.getError()?.message).toBe('Failed to connect to the database while saving token');
        });
    });
});
