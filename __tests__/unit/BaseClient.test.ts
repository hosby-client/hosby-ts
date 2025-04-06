// Mock JSEncrypt and window before importing anything
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

import { BaseClient, SecureClientConfig } from '../../src/clients/BaseClient';

// Mock fetch globally
global.fetch = jest.fn();

describe('BaseClient', () => {
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mock response for CSRF token
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            headers: {
                get: jest.fn().mockReturnValue(null)
            },
            json: async () => ({ success: true, data: { token: 'mock-csrf-token' } }),
            status: 200
        });
    });

    describe('Constructor', () => {
        test('should throw error if baseURL is missing', () => {
            expect(() => {
                new BaseClient({} as any);
            }).toThrow('Base URL is required');
        });

        test('should create instance with secure config', () => {
            const config: SecureClientConfig = {
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
            };

            const client = new BaseClient(config);
            expect(client).toBeInstanceOf(BaseClient);
        });

        test('should enforce HTTPS in strict mode', () => {
            const config: SecureClientConfig = {
                baseURL: 'http://api.hosby.com', // Note: HTTP not HTTPS
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                httpsMode: 'strict'
            };

            expect(() => {
                new BaseClient(config);
            }).toThrow(/HTTPS protocol is required/);
        });

        test('should allow HTTP for exempt hosts', () => {
            const config: SecureClientConfig = {
                baseURL: 'http://localhost:3000', // localhost should be exempt
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                httpsMode: 'strict'
            };

            const client = new BaseClient(config);
            expect(client).toBeInstanceOf(BaseClient);
        });
    });

    describe('init()', () => {
        test('should fetch CSRF token', async () => {
            const client = new BaseClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
            });

            await client.init();

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.hosby.com/api/secure/csrf-token',
                expect.objectContaining({
                    method: 'GET'
                })
            );
        });

        test('should throw error if CSRF token fetch fails', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: true, data: {} }), // Missing token
                status: 200
            });

            const client = new BaseClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
            });

            await expect(client.init()).rejects.toThrow('Invalid CSRF token response');
        });
    });

    describe('request()', () => {
        let client: BaseClient;

        beforeEach(async () => {
            client = new BaseClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
            });

            await client.init();

            // Reset fetch mock for request tests
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: true, data: { result: 'success' } }),
                status: 200
            });
        });
        test('should make GET request with correct params', async () => {
            const response = await (client as any).request(
                'GET',
                'test/path',
                [{ field: 'name', value: 'test' }]
            );

            expect(response).toEqual({ success: true, data: { result: 'success' } });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.hosby.com/test/path'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );

            // Check filter parameter
            const url = (global.fetch as jest.Mock).mock.calls[0][0];
            expect(url).toContain('filter=');
            expect(url).toContain(encodeURIComponent(JSON.stringify([{ field: 'name', value: 'test' }])));
        });

        test('should make POST request with body', async () => {
            const data = { name: 'Test', value: 123 };

            await (client as any).request(
                'POST',
                'test/path',
                undefined,
                undefined,
                data
            );

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.hosby.com/test/path',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );
        });

        test('should include query options in headers', async () => {
            await (client as any).request(
                'GET',
                'test/path',
                undefined,
                {
                    populate: ['field1', 'field2'],
                    skip: 10,
                    limit: 20,
                    query: { date: { $gt: '2023-01-01' } }
                }
            );

            const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
            expect(headers['x-query']).toBeDefined();

            const queryHeader = JSON.parse(headers['x-query']);
            expect(queryHeader['x-populate']).toEqual(['field1', 'field2']);
            expect(queryHeader['x-skip']).toBe(10);
            expect(queryHeader['x-limit']).toBe(20);
            expect(queryHeader['x-query']).toEqual({ date: { $gt: '2023-01-01' } });
        });

        test('should throw error for invalid parameters', async () => {
            await expect((client as any).request(undefined as any, undefined as any))
                .rejects.toThrow('Method and path are required');
        });

        test('should handle error responses', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({
                    success: false,
                    message: 'Resource not found',
                    status: 404
                })
            });

            await expect((client as any).request('GET', 'test/path'))
                .rejects.toEqual({
                    success: false,
                    message: 'Resource not found',
                    status: 404
                });
        });

        test('should handle network errors', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect((client as any).request('GET', 'test/path'))
                .rejects.toEqual({
                    success: false,
                    status: 500,
                    message: 'Network error'
                });
        });
    });

    describe('Authentication Headers', () => {
        test('should include signature, timestamp and API key when using secure config', async () => {
            const client = new BaseClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
            });

            await client.init();

            // Reset fetch mock for this test
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: true, data: {} }),
                status: 200
            });

            // Replace Date.now to get consistent timestamps for testing
            const originalNow = Date.now;
            Date.now = jest.fn().mockReturnValue(1633046400000); // Fixed timestamp

            try {
                await (client as any).request('GET', 'test/path');

                const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
                expect(headers['x-signature']).toBeDefined();
                expect(headers['x-timestamp']).toBe('1633046400000');
                expect(headers['x-api-key']).toBe('test-public-key-id_test-project-id_test-user-id');
            } finally {
                // Restore original Date.now
                Date.now = originalNow;
            }
        });
    });
});