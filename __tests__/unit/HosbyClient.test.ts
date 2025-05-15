// Mock JSEncrypt and window before importing anything
jest.useFakeTimers()
jest.mock('jsencrypt', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            setPrivateKey: jest.fn(),
            sign: jest.fn().mockReturnValue('mocked-signature')
        }))
    };
});

// Mock window object
global.window = {} as any;

import { HosbyClient, createClient, BaseClientConfig } from '../../src';
import { BaseClient } from '../../src/clients/BaseClient';
import { GetQueryClient } from '../../src/clients/crud/get.query';
import { PostQueryClient } from '../../src/clients/crud/post.query';
import { PutQueryClient } from '../../src/clients/crud/put.query';
import { PatchQueryClient } from '../../src/clients/crud/patch.query';
import { DeleteQueryClient } from '../../src/clients/crud/delete.query';

// Mock the BaseClient
jest.mock('../../src/clients/BaseClient');

describe('HosbyClient', () => {
    // Sample configuration
    const config: BaseClientConfig = {
        baseURL: 'https://api.hosby.com',
        privateKey: 'mock-private-key',
        projectId: 'mock-project-id',
        projectName: 'mockprojectname',
        apiKeyId: 'mock-api-key-id',
        userId: 'mock-user-id'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock init method
        (BaseClient.prototype.init as jest.Mock).mockResolvedValue(undefined);
    });

    describe('constructor', () => {
        test('should throw error if config is missing', () => {
            expect(() => {
                new HosbyClient(undefined as any);
            }).toThrow('Configuration is required');
        });

        test('should create instance with valid config', () => {
            const client = new HosbyClient(config);
            expect(client).toBeInstanceOf(HosbyClient);
            expect(BaseClient).toHaveBeenCalledWith(config);
        });

        test('should initialize all CRUD clients', () => {
            const client = new HosbyClient(config);

            // Check that all query clients are initialized
            expect((client as any).crudClient.get).toBeDefined();
            expect((client as any).crudClient.post).toBeDefined();
            expect((client as any).crudClient.put).toBeDefined();
            expect((client as any).crudClient.patch).toBeDefined();
            expect((client as any).crudClient.delete).toBeDefined();
        });

        test('should bind all CRUD methods', () => {
            const client = new HosbyClient(config);

            // Check that GET methods are bound
            expect(client.find).toBeDefined();
            expect(client.findById).toBeDefined();
            expect(client.findByEmail).toBeDefined();
            expect(client.findByToken).toBeDefined();
            expect(client.findByField).toBeDefined();
            expect(client.findGreaterThan).toBeDefined();
            expect(client.findLessThan).toBeDefined();
            expect(client.findEqual).toBeDefined();
            expect(client.findAndPopulate).toBeDefined();
            expect(client.count).toBeDefined();
            expect(client.aggregate).toBeDefined();
            expect(client.distinct).toBeDefined();

            // Check that POST methods are bound
            expect(client.insertOne).toBeDefined();
            expect(client.insertMany).toBeDefined();
            expect(client.upsert).toBeDefined();

            // Check that PUT methods are bound
            expect(client.replaceOne).toBeDefined();
            expect(client.findOneAndReplace).toBeDefined();

            // Check that PATCH methods are bound
            expect(client.updateOne).toBeDefined();
            expect(client.updateMany).toBeDefined();
            expect(client.findOneAndUpdate).toBeDefined();

            // Check that DELETE methods are bound
            expect(client.deleteOne).toBeDefined();
            expect(client.deleteMany).toBeDefined();
            expect(client.deleteByField).toBeDefined();
            expect(client.deleteByToken).toBeDefined();
            expect(client.deleteById).toBeDefined();
            expect(client.findOneAndDelete).toBeDefined();
        });
    });

    describe('init()', () => {
        test('should call BaseClient.init()', async () => {
            const client = new HosbyClient(config);
            await client.init();

            expect(BaseClient.prototype.init).toHaveBeenCalled();
        });

        test('should propagate errors from BaseClient.init()', async () => {
            (BaseClient.prototype.init as jest.Mock).mockRejectedValueOnce(new Error('Init failed'));

            const client = new HosbyClient(config);
            await expect(client.init()).rejects.toThrow('Init failed');
        });
    });

    describe('createClient factory function', () => {
        test('should throw error if required config fields are missing', () => {
            expect(() => {
                createClient({
                    baseURL: 'https://api.hosby.com'
                } as any);
            }).toThrow(/baseURL, privateKey, publicKeyId, projectId and userId are required/);
        });

        test('should return HosbyClient instance when all required config fields are provided', () => {
            const validConfig = {
                baseURL: 'https://api.example.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id', 
                projectId: 'test-project-id',
                userId: 'test-user-id'
            };

            const client = createClient({
                ...validConfig,
                apiKeyId: 'test-api-key-id',
                projectName: 'test-project-name'
            });

            expect(client).toBeInstanceOf(HosbyClient);
            expect(BaseClient).toHaveBeenCalledWith({
                ...validConfig,
                apiKeyId: 'test-api-key-id', 
                projectName: 'test-project-name'
            });
        });
    });

    describe('Method delegation', () => {
        // Setup mock implementations for CRUD client methods
        let mockFindImpl: jest.Mock;
        let mockInsertOneImpl: jest.Mock;
        let mockReplaceOneImpl: jest.Mock;
        let mockUpdateOneImpl: jest.Mock;
        let mockDeleteOneImpl: jest.Mock;

        beforeEach(() => {
            // Create mock implementations
            mockFindImpl = jest.fn().mockResolvedValue({ success: true, data: [] });
            mockInsertOneImpl = jest.fn().mockResolvedValue({ success: true, data: { id: '123' } });
            mockReplaceOneImpl = jest.fn().mockResolvedValue({ success: true, data: { id: '123' } });
            mockUpdateOneImpl = jest.fn().mockResolvedValue({ success: true, data: { id: '123' } });
            mockDeleteOneImpl = jest.fn().mockResolvedValue({ success: true, data: { id: '123' } });

            // Mock the CrudClient's methods
            jest.spyOn(GetQueryClient.prototype, 'find').mockImplementation(mockFindImpl);
            jest.spyOn(PostQueryClient.prototype, 'insertOne').mockImplementation(mockInsertOneImpl);
            jest.spyOn(PutQueryClient.prototype, 'replaceOne').mockImplementation(mockReplaceOneImpl);
            jest.spyOn(PatchQueryClient.prototype, 'updateOne').mockImplementation(mockUpdateOneImpl);
            jest.spyOn(DeleteQueryClient.prototype, 'deleteOne').mockImplementation(mockDeleteOneImpl);
        });

        test('should delegate find() to GetQueryClient.find', async () => {
            const client = new HosbyClient(config);
            const table = 'users';
            const filters = [{ field: 'active', value: true }];
            const options = { limit: 10 };

            await client.find(table, filters, options);

            expect(mockFindImpl).toHaveBeenCalledWith(table, filters, options);
        });

        test('should delegate insertOne() to PostQueryClient.insertOne', async () => {
            const client = new HosbyClient(config);
            const table = 'users';
            const data = { name: 'Test User' };
            const options = { populate: ['profile'] };

            await client.insertOne(table, data, options);

            expect(mockInsertOneImpl).toHaveBeenCalledWith(table, data, options);
        });

        test('should delegate replaceOne() to PutQueryClient.replaceOne', async () => {
            const client = new HosbyClient(config);
            const table = 'users';
            const filters = [{ field: 'id', value: '123' }];
            const data = { name: 'Updated User' };

            await client.replaceOne(table, data, filters);

            expect(mockReplaceOneImpl).toHaveBeenCalledWith(table, data, filters);
        });

        test('should delegate updateOne() to PatchQueryClient.updateOne', async () => {
            const client = new HosbyClient(config);
            const table = 'users';
            const filters = [{ field: 'id', value: '123' }];
            const data = { status: 'active' };

            await client.updateOne(table, data, filters);

            expect(mockUpdateOneImpl).toHaveBeenCalledWith(table, data, filters);
        });

        test('should delegate deleteOne() to DeleteQueryClient.deleteOne', async () => {
            const client = new HosbyClient(config);
            const table = 'users';
            const filters = [{ field: 'id', value: '123' }];

            await client.deleteOne(table, filters);

            expect(mockDeleteOneImpl).toHaveBeenCalledWith(table, filters);
        });

        test('should propagate errors from delegated methods', async () => {
            mockFindImpl.mockRejectedValueOnce(new Error('Find failed'));

            const client = new HosbyClient(config);
            await expect(client.find('table', [])).rejects.toThrow('Find failed');
        });
    });
});