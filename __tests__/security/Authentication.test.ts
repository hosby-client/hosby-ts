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

        test('should include CSRF token in subsequent requests', async () => {
            const client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
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
            await client.find('project', 'users', []);

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
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
            });

            await expect(client.init()).rejects.toThrow('Invalid CSRF token response');
        });
    });

    describe('API Key Authentication', () => {
        test('should include API key in Authorization header', async () => {
            const client = new BaseClient({
                baseURL: 'https://api.hosby.com',
                apiKey: 'test-api-key',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
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
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id'
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
                await client.find('project', 'users', []);

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

    describe('HTTPS Security', () => {
        test('should enforce HTTPS in strict mode', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'http://api.hosby.com', // HTTP not HTTPS
                    privateKey: 'test-private-key',
                    publicKeyId: 'test-public-key-id',
                    projectId: 'test-project-id',
                    userId: 'test-user-id',
                    httpsMode: 'strict'
                });
            }).toThrow(/HTTPS protocol is required/);
        });

        test('should allow HTTP for exempt hosts', () => {
            const client = new HosbyClient({
                baseURL: 'http://localhost:3000',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                httpsMode: 'strict'
            });

            expect(client).toBeInstanceOf(HosbyClient);
        });

        test('should warn about insecure connection in warn mode', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'http://api.hosby.com', // HTTP not HTTPS
                    privateKey: 'test-private-key',
                    publicKeyId: 'test-public-key-id',
                    projectId: 'test-project-id',
                    userId: 'test-user-id',
                    httpsMode: 'warn'
                });
            }).toThrow(/Using insecure HTTP connection/);
        });

        test('should allow HTTP in none mode', () => {
            const client = new HosbyClient({
                baseURL: 'http://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id',
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
            }).toThrow('Secure config is required with privateKey, publicKeyId, userId and projectId');
        });

        test('should detect empty authentication fields', () => {
            expect(() => {
                new HosbyClient({
                    baseURL: 'https://api.hosby.com',
                    privateKey: '',
                    publicKeyId: 'test-public-key-id',
                    projectId: 'test-project-id',
                    userId: 'test-user-id'
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
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
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
        });

        test('should validate project and table parameters', async () => {
            // First try with missing project
            await expect(client.find('', 'users', [])).rejects.toThrow(/Project.+required/i);

            // Then try with missing table
            await expect(client.find('project', '', [])).rejects.toThrow(/[Tt]able.+required/i);
        });

        test('should validate query filters when required', async () => {
            // Methods that require filters should throw when filters are missing
            await expect(client.findById('project', 'users', [])).rejects.toThrow(/filter/i);

            // Count method should work without filters
            await expect(client.count('project', 'users')).resolves.not.toThrow();
        });
    });

    describe('Timeout and Retry Settings', () => {
        test('should honor timeout configuration', async () => {
            const client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                publicKeyId: 'test-public-key-id',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                timeout: 1000 // 1 second
            });

            await client.init();

            // Reset fetch mock
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Request timed out'));
                    }, 1500); // Longer than timeout
                })
            );

            // Start request and verify it times out
            await expect(client.find('project', 'users', [])).rejects.toEqual({
                success: false,
                status: 500,
                message: 'Request timed out'
            });

        }, 3000); // Only need 3s for test
    });
});