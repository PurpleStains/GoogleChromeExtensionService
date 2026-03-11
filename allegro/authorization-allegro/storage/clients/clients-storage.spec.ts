// import { ClientData } from '../../types/client.type.js';
// import { ClientResponse } from '../../../allegro-clients/types/index.js';

// const mockGet = jest.fn();
// const mockSet = jest.fn();
// const mockDoc = jest.fn(() => ({
//     get: mockGet,
//     set: mockSet,
// }));
// const mockCollection = jest.fn(() => ({
//     doc: mockDoc,
// }));

// jest.mock('@google-cloud/firestore', () => ({
//     Firestore: jest.fn().mockImplementation(() => ({
//         collection: mockCollection,
//     })),
// }));

// import { GetClient, CreateClient } from '../clients/clients-storage.js';

// const successClientResponse: ClientResponse = {
//     clientLogin: 'test-login',
// }

// describe('Clients Storage', () => {
//     beforeEach(() => {
//         jest.clearAllMocks();
//     });

//     describe('GetClient', () => {
//         it('should return client data when client exists', async () => {
//             const mockClientData: ClientData = {
//                 clientLogin: 'test-login',
//                 clientId: 'test-id',
//                 clientSecret: 'test-secret',
//             };

//             mockGet.mockResolvedValue({
//                 exists: true,
//                 data: () => mockClientData,
//             });

//             const result = await GetClient('test-login');

//             expect(mockDoc).toHaveBeenCalledWith('test-login');
//             expect(mockGet).toHaveBeenCalled();
//             expect(result.isSuccess()).toBe(true);
//             expect(result.getValue()).toEqual(successClientResponse);
//         });

//         it('should return error when client does not exist', async () => {
//             mockGet.mockResolvedValue({
//                 exists: false,
//             });

//             const result = await GetClient('non-existent');

//             expect(result.isFailure()).toBe(true);
//             expect(result.getError()?.message).toBe('Client does not exist');
//         });

//         it('should return error when Firestore operation fails', async () => {
//             mockGet.mockRejectedValue(new Error('Firestore error'));

//             const result = await GetClient('test-login');

//             expect(result.isFailure()).toBe(true);
//             expect(result.getError()?.message).toBe('Firestore error');
//         });
//     });

//     describe('CreateClient', () => {
//         const mockClientData: ClientData = {
//             clientLogin: 'new-login',
//             clientId: 'new-id',
//             clientSecret: 'new-secret',
//         };

//         it('should create new client successfully', async () => {
//             mockGet.mockResolvedValue({ exists: false });
//             mockSet.mockResolvedValue(undefined);

//             const result = await CreateClient(mockClientData);

//             expect(mockDoc).toHaveBeenCalledWith('new-login');
//             expect(mockSet).toHaveBeenCalledWith(mockClientData);
//             expect(result.isSuccess()).toBe(true);
//             expect(result.getValue()).toEqual(mockClientData);
//         });

//         it('should return error when client already exists', async () => {
//             mockGet.mockResolvedValue({ exists: true });

//             const result = await CreateClient(mockClientData);

//             expect(result.isFailure()).toBe(true);
//             expect(result.getError()?.message).toBe('Client already exists');
//             expect(mockSet).not.toHaveBeenCalled();
//         });

//         it('should return error when Firestore set operation fails', async () => {
//             mockGet.mockResolvedValue({ exists: false });
//             mockSet.mockRejectedValue(new Error('Firestore error'));

//             const result = await CreateClient(mockClientData);

//             expect(result.isFailure()).toBe(true);
//             expect(result.getError()?.message).toBe('Firestore error');
//         });

//         it('should handle empty clientLogin', async () => {
//             const emptyClient: ClientData = {
//                 clientLogin: '',
//                 clientId: 'id',
//                 clientSecret: 'secret',
//             };

//             mockGet.mockResolvedValue({ exists: false });
//             mockSet.mockResolvedValue(undefined);

//             const result = await CreateClient(emptyClient);

//             expect(mockDoc).toHaveBeenCalledWith('');
//             expect(result.isSuccess()).toBe(true);
//             expect(result.getValue()).toEqual(emptyClient);
//         });
//     });
// });
