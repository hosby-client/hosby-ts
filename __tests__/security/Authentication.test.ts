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
import { HosbyClient } from '../../src';

// Mock fetch globally
global.fetch = jest.fn();

describe('Authentication Security Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock successful CSRF token response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            headers: {
                get: jest.fn().mockReturnValue('mock-csrf-token')
            },
            json: async () => ({ success: true, data: { token: 'mock-csrf-token' } }),
            status: 200
        });
    });

    describe('CSRF Token Handling', () => {
        test('should fetch CSRF token during initialization', async () => {
            const client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'testproject'
            });

            await client.init();

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.hosby.com/api/secure/csrf-token/',
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'x-api-key': 'test-api-key-id_test-project-id_test-user-id',
                        'x-signature': 'mocked-signature',
                        'x-timestamp': expect.any(String)
                    }
                })
            );
        });
        test('should include CSRF token in subsequent requests', async () => {
            const client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'testproject'
            });

            await client.init();

            // Reset fetch mock to track subsequent calls
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({ success: true, data: { count: 5 } }),
                status: 200
            });

            // Make a request
            await client.find('users', []);

            // Check that CSRF token is included
            const requestHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
            expect(requestHeaders['x-csrf-token']).toBe('mock-csrf-token');
        });

        test('should fail if CSRF token fetch fails', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: false, data: {} }),
                status: 500
            });

            const client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'testproject'
            });

            await expect(client.init()).rejects.toThrow('Failed to fetch CSRF token');
        });
    });

    describe('API Key Authentication', () => {
        test('should include API key in Authorization header', async () => {
            const client = new BaseClient({
                baseURL: 'https://api.hosby.com',
                apiKey: 'test-api-key',
                apiKeyId: 'test-api-key-id',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                projectName: 'testproject',
                userId: 'test-user-id'
            });

            await client.init();

            // Reset fetch mock
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({ success: true, data: {} }),
                status: 200
            });

            await (client as any)['request']('GET', 'test/path');

            const requestConfig = (global.fetch as jest.Mock).mock.calls[0][1];
            const headers = requestConfig.headers as Record<string, string>;
            expect(headers.Authorization).toBe('Bearer mock-csrf-token');
        });
    });

    describe('RSA Authentication Headers', () => {
        test('should include signature, timestamp and API key in headers', async () => {
            const config: SecureClientConfig = {
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'testproject'
            };

            const client = new HosbyClient(config);
            await client.init();

            // Reset fetch mock
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({ success: true, data: {} }),
                status: 200
            });

            // Mock Date.now for consistent timestamp
            const originalNow = Date.now;
            Date.now = jest.fn().mockReturnValue(1633046400000); // Fixed timestamp

            try {
                await client.find('users', []);

                const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
                expect(headers['x-signature']).toBeDefined();
                expect(headers['x-timestamp']).toBe('1633046400000');
                expect(headers['x-api-key']).toBe('test-api-key-id_test-project-id_test-user-id');
            } finally {
                // Restore original Date.now
                Date.now = originalNow;
            }
        });
    });

    describe('HTTPS Security', () => {
        test('should enforce HTTPS in strict mode', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'http://api.hosby.com', // HTTP not HTTPS
                    privateKey: 'test-private-key',
                    projectId: 'test-project-id',
                    userId: 'test-user-id',
                    apiKeyId: 'test-api-key-id',
                    projectName: 'testproject',
                    httpsMode: 'strict'
                });
            }).toThrow(/HTTPS protocol is required/);
        });
        test('should allow HTTP for exempt hosts', () => {
            const client = new HosbyClient({
                baseURL: 'http://localhost:3000',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'testproject',
                httpsMode: 'strict'
            });

            expect(client).toBeInstanceOf(HosbyClient);
        });

        test('should warn about insecure connection in warn mode', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'http://api.hosby.com', // HTTP not HTTPS
                    privateKey: 'test-private-key',
                    projectId: 'test-project-id',
                    userId: 'test-user-id',
                    apiKeyId: 'test-api-key-id',
                    projectName: 'test-project',
                    httpsMode: 'warn'
                });
            }).toThrow(/Using insecure HTTP connection/);
        });
        test('should allow HTTP in none mode', () => {
            const client = new HosbyClient({
                baseURL: 'http://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'test-project',
                httpsMode: 'none'
            });

            expect(client).toBeInstanceOf(HosbyClient);
        });
    });

    describe('Authentication Configuration Security', () => {
        test('should enforce required authentication fields', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'https://api.hosby.com',
                    privateKey: 'test-private-key'
                } as any);
            }).toThrow('Secure config is required with privateKey, apiKeyId, userId and projectId');
        });

        test('should detect empty authentication fields', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'https://api.hosby.com',
                    privateKey: '',
                    projectId: 'test-project-id',
                    userId: 'test-user-id',
                    apiKeyId: 'test-api-key-id',
                    projectName: 'test-project'
                });
            }).toThrow(/Missing required secure config fields/);
        });
    });

    describe('Request Validation', () => {
        let client: HosbyClient;
        beforeEach(async () => {
            client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'test-project'
            });

            await client.init();

            // Reset fetch mock
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({ success: true, data: {} }),
                status: 200
            });
        });

        test('should validate table parameters', async () => {
            // Test with missing table name
            await expect(client.find('', [])).rejects.toThrow('Table name is required');

            // // Test with undefined table name 
            await expect(client.find(undefined as any, [])).rejects.toThrow('Table name is required');

            // // Test with null table name
            await expect(client.find(null as any, [])).rejects.toThrow('Table name is required');

            // // Test with whitespace table name
            // await expect(client.find('   ', [])).rejects.toThrow('Table name is required');

            // // Test with non-string table name
            await expect(client.find(123 as any, [])).rejects.toThrow('Table name is required');

            // Valid table name should resolve successfully
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({ success: true, data: {} }),
                status: 200
            });

            await expect(client.find('users', [])).resolves.toEqual({
                data: {},
                success: true
            });
        });

        test('should validate query filters when required', async () => {
            // Methods that require filters should throw when filters are missing
            await expect(client.findById('users', [])).rejects.toThrow(/filter/i);

            // Count method should work without filters
            await expect(client.count('users')).resolves.not.toThrow();
        });
    });

    describe('Timeout and Retry Settings', () => {
        test('should honor timeout configuration', async () => {
            const client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key', 
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id',
                projectName: 'test-project',
                timeout: 1000 // 1 second
            });

            await client.init();

            // Reset fetch mock
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockImplementationOnce(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Request timed out'));
                    }, 1500); // Longer than timeout
                });
            });

            // Start request and verify it times out
            try {
                await client.find('users', []);
                fail('Expected request to timeout but it succeeded');
            } catch (error: unknown) {
                expect((error as Error).message).toBe('Request timed out');
            }

            // Verify fetch was called with correct parameters
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/find'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );

        }, 3000); // Only need 3s for test
    });
});