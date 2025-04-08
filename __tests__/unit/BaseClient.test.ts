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

import JSEncrypt from 'jsencrypt';
import { BaseClient, SecureClientConfig } from '../../src/clients/BaseClient';

// Mock fetch globally
global.fetch = jest.fn();
const config: SecureClientConfig = {
    baseURL: 'http://api.hosby.com', // Note: HTTP not HTTPS
    privateKey: 'test-private-key',
    projectId: 'test-project-id',
    userId: 'test-user-id',
    apiKeyId: 'test-api-key-id',
    projectName: 'testproject',
    httpsMode: 'strict'
};

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

        test('should create instance with secure config when using HTTPS', () => {
            const secureConfig = {
                ...config,
                baseURL: 'https://api.hosby.com' // Use HTTPS
            };
            const client = new BaseClient(secureConfig);
            expect(client).toBeInstanceOf(BaseClient);
        });

        test('should enforce HTTPS in strict mode', () => {
            expect(() => {
                new BaseClient(config);
            }).toThrow(/HTTPS protocol is required/);
        });

        test('should allow HTTP for exempt hosts', () => {
            const localConfig = {
                ...config,
                baseURL: 'http://localhost:3000',
                httpsMode: 'strict',
                httpsExemptHosts: ['localhost']
            };
            const client = new BaseClient(localConfig);
            expect(client).toBeInstanceOf(BaseClient);
        });
    });

    describe('init()', () => {
        test('should fetch CSRF token with HTTPS protocol', async () => {
            const secureConfig = {
                ...config,
                baseURL: 'https://api.hosby.com',
                httpsMode: 'strict'
            };
            const client = new BaseClient(secureConfig);

            // Mock signature generation
            jest.spyOn(Date, 'now').mockReturnValue(1743978457316);
            
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
                        'x-timestamp': '1743978457316'
                    }
                })
            );
        });

        test('should allow HTTP for exempt hosts when fetching CSRF token', async () => {
            const localConfig = {
                ...config,
                baseURL: 'http://localhost:3000',
                httpsMode: 'strict',
                httpsExemptHosts: ['localhost']
            };
            const client = new BaseClient(localConfig);

            // Mock signature generation
            jest.spyOn(Date, 'now').mockReturnValue(1743978457323);
            
            // No need to mock JSEncrypt here as it's already mocked globally in setup

            await client.init();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/secure/csrf-token/',
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'x-api-key': 'test-api-key-id_test-project-id_test-user-id',
                        'x-signature': 'mocked-signature',
                        'x-timestamp': '1743978457323'
                    }
                })
            );
        });

        test('should enforce HTTPS for CSRF token fetch', async () => {
            const insecureConfig = {
                ...config,
                baseURL: 'http://api.hosby.com', // Insecure HTTP URL
                httpsMode: 'strict'
            };

            expect(() => {
                new BaseClient(insecureConfig);
            }).toThrow('HTTPS protocol is required for secure connections. Use httpsExemptHosts to allow specific hostnames or set httpsMode to "warn" or "none" for development.');

            // Should allow HTTP for exempt hosts
            const exemptConfig = {
                ...insecureConfig,
                httpsExemptHosts: ['api.hosby.com']
            };

            expect(() => {
                new BaseClient(exemptConfig);
            }).not.toThrow();

            // Should require HTTPS for non-exempt hosts
            const nonExemptConfig = {
                ...insecureConfig,
                httpsExemptHosts: ['other-domain.com']
            };

            expect(() => {
                new BaseClient(nonExemptConfig);
            }).toThrow('HTTPS protocol is required for secure connections');
        });
    });

    describe('request()', () => {
        let client: BaseClient;

        beforeEach(async () => {
            const secureConfig = {
                ...config,
                baseURL: 'https://api.hosby.com'
            };
            client = new BaseClient(secureConfig);
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

        test('should make GET request with correct params and enforce HTTPS', async () => {
            const response = await (client as any).request(
                'GET',
                'test/path',
                [{ field: 'name', value: 'test' }]
            );

            expect(response).toEqual({ success: true, data: { result: 'success' } });

            // Verify the URL and request options
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.hosby.com/test/path/?name=test',
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-csrf-token': 'mock-csrf-token',
                        'x-api-key': 'test-api-key-id_test-project-id_test-user-id',
                        'x-signature': 'mocked-signature',
                        'x-timestamp': '1743978457323'
                    }
                }
            );

            // Verify URL uses HTTPS
            const url = (global.fetch as jest.Mock).mock.calls[0][0];
            expect(url).toMatch(/^https:\/\//);
        });

        test('should handle missing CSRF token in POST requests', async () => {
            // Create a new client instance without initializing CSRF token
            const newClient = new BaseClient({
                ...config,
                baseURL: 'https://api.hosby.com'
            });

            // Mock response for CSRF token endpoint with missing token
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: { token: null } // Explicitly set token to null
                }),
                status: 200
            });

            // Should throw the specific error from BaseClient
            await expect(newClient.init())
                .rejects
                .toThrow('Invalid CSRF token response: token missing from response data');

            // Verify request was made to CSRF endpoint
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('api/secure/csrf-token'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );

            // Reset mock for second test
            (global.fetch as jest.Mock).mockReset();

            // Create another client for testing null response
            const anotherClient = new BaseClient({
                ...config,
                baseURL: 'https://api.hosby.com'
            });

            // Mock null response - ensure it actually returns null
            (global.fetch as jest.Mock).mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    headers: {
                        get: jest.fn().mockReturnValue(null)
                    },
                    json: async () => ({ success: true, data: { token: null } }), // Explicitly set token to null
                    status: 200
                })
            );

            // Should throw error for null response
            await expect(anotherClient.init())
                .rejects
                .toThrow('Invalid CSRF token response: token missing from response data');
        });

        test('should handle invalid CSRF token responses', async () => {
            // Mock fetch to return invalid CSRF token response
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: true, data: { token: null } }), // Explicitly set token to null
                status: 200
            });

            const testClient = new BaseClient({
                ...config,
                baseURL: 'https://api.hosby.com'
            });

            // Should throw error for null response
            await expect(testClient.init())
                .rejects
                .toThrow('Invalid CSRF token response: token missing from response data');

            // Reset mock for second test
            (global.fetch as jest.Mock).mockReset();
            
            // Create new client for second test
            const testClient2 = new BaseClient({
                ...config,
                baseURL: 'https://api.hosby.com'
            });

            // Mock empty response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: true, data: { token: null } }), // Explicitly set token to null
                status: 200
            });

            // Should throw error for missing token
            await expect(testClient2.init())
                .rejects
                .toThrow('Invalid CSRF token response: token missing from response data');
        });

        test('should throw error for invalid parameters and handle CSRF token initialization', async () => {
            // Mock successful CSRF token response for init() call
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers(),
                json: async () => ({ success: true, data: { token: 'test-token' } }),
                status: 200
            });

            // Test that undefined method/path throws error
            await expect((client as any).request(undefined as any, undefined as any))
                .rejects.toThrow('Method and path are required');

            // Test that exempt host allows HTTP and initializes successfully
            const exemptClient = new BaseClient({
                ...config,
                baseURL: 'http://localhost:3000',
                httpsMode: 'strict',
                httpsExemptHosts: ['localhost']
            });

            // Mock CSRF token response for exempt client
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers(),
                json: async () => ({ success: true, data: { token: 'test-token' } }),
                status: 200
            });

            await expect(exemptClient.init()).resolves.not.toThrow();
        });

        test('should handle error responses for non-HTTPS requests', async () => {
            // Test that exempt hosts work
            const exemptClient = new BaseClient({
                ...config,
                baseURL: 'http://localhost:3000',
                httpsMode: 'strict',
                httpsExemptHosts: ['localhost']
            });

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

            await expect((exemptClient as any).request('GET', 'test/path')).rejects.toEqual({
                success: false,
                message: 'Resource not found',
                status: 404
            });
        });

        test('should handle network errors and HTTPS requirements', async () => {
            // Test network error
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect((client as any).request('GET', 'test/path'))
                .rejects.toEqual({
                    success: false,
                    status: 500,
                    message: 'Network error'
                });

            // Test exempt host allows HTTP
            const exemptClient = new BaseClient({
                ...config,
                baseURL: 'http://localhost:3000',
                httpsMode: 'strict',
                httpsExemptHosts: ['localhost']
            });

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue(null)
                },
                json: async () => ({ success: true })
            });

            await expect((exemptClient as any).request('GET', 'test/path'))
                .resolves.toEqual({ success: true });
        });
    });

    describe('Authentication Headers', () => {
        test('should include signature, timestamp and API key when using secure config', async () => {
            const client = new BaseClient({
                ...config,
                baseURL: 'https://api.example.com',
                httpsMode: 'strict'
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
            Date.now = jest.fn().mockReturnValue(1633046400000);

            try {
                await (client as any).request('GET', 'test/path');

                const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
                expect(headers['x-signature']).toBeDefined();
                expect(headers['x-timestamp']).toBe('1633046400000');
                expect(headers['x-api-key']).toBe('test-api-key-id_test-project-id_test-user-id');
            } finally {
                Date.now = originalNow;
            }
        });
    });
});