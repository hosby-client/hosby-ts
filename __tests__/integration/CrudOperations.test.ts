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

import { HosbyClient, BaseClientConfig } from '../../src';
import { ApiResponse, QueryFilter } from '../../src/types';

// Mock fetch globally
const mockResponseData = {
    success: true,
    status: 200,
    message: 'Operation successful',
    data: {},
};

// Mock implementation for global fetch
global.fetch = jest.fn().mockImplementation((url: string, options: RequestInit) => {
    // Customize response based on URL and options
    const method = options.method || 'GET';
    const path = url.toString().split('/').slice(3).join('/');
    const body = options.body ? JSON.parse(options.body.toString()) : undefined;

    // Customize mock data based on the request
    let responseData = { ...mockResponseData };

    // CSRF token request
    if (path === 'api/secure/csrf-token') {
        responseData.data = { token: 'mock-csrf-token' };
    }
    // GET requests
    else if (method === 'GET') {
        if (path.includes('find')) {
            if (path.includes('findById')) {
                responseData.data = { id: '123', name: 'Test Item' };
            } else if (path.includes('count')) {
                responseData.data = { count: 5 };
            } else {
                responseData.data = [
                    { id: '123', name: 'Item 1' },
                    { id: '456', name: 'Item 2' },
                ];
            }
        }
    }
    // POST requests
    else if (method === 'POST') {
        if (path.includes('insertOne')) {
            responseData.status = 201;
            responseData.data = { id: '789', ...body };
        } else if (path.includes('insertMany')) {
            responseData.status = 201;
            responseData.data = body.map((item: any, index: number) => ({
                id: `id-${index}`,
                ...item,
            }));
        } else if (path.includes('upsert')) {
            responseData.data = { id: '123', ...body };
        }
    }
    // PUT requests
    else if (method === 'PUT') {
        responseData.data = { id: '123', ...body };
    }
    // PATCH requests
    else if (method === 'PATCH') {
        if (path.includes('updateMany')) {
            responseData.data = { modifiedCount: 2 };
        } else {
            responseData.data = { id: '123', ...body };
        }
    }
    // DELETE requests
    else if (method === 'DELETE') {
        if (path.includes('deleteMany')) {
            responseData.data = { deletedCount: 2 };
        } else {
            responseData.data = { id: '123', name: 'Deleted Item' };
        }
    }

    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseData),
        status: responseData.status,
        statusText: 'OK',
        headers: new Headers({
            'Authorization': 'Bearer mock-token'
        })
    });
});

describe('HosbyClient Integration - CRUD Operations', () => {
    let client: HosbyClient;
    const config: BaseClientConfig = {
        baseURL: 'https://api.hosby.com',
        privateKey: 'mock-private-key',
        publicKeyId: 'mock-public-key-id',
        projectId: 'mock-project-id',
        userId: 'mock-user-id',
    };
    const project = 'workspace';
    const table = 'users';

    beforeEach(async () => {
        jest.clearAllMocks();
        client = new HosbyClient(config);
        await client.init();
    });

    describe('GET Operations', () => {
        test('should fetch multiple documents with find()', async () => {
            const filters: QueryFilter[] = [{ field: 'active', value: true }];
            const options = { limit: 10, skip: 0, populate: ['profile'] };

            const response = await client.find<any[]>(project, table, filters, options);

            expect(response.success).toBe(true);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);

            // Verify correct URL and query parameters
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/find`),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                })
            );
        });

        test('should find a document by ID', async () => {
            const id = '123';
            const filters: QueryFilter[] = [{ field: 'id', value: id }];

            const response = await client.findById<{ id: string; name: string }>(project, table, filters);

            expect(response.success).toBe(true);
            expect(response.data.id).toBe(id);
            expect(response.data.name).toBeDefined();

            // Verify correct URL and parameters
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/findById`),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );
        });

        test('should count documents', async () => {
            const filters: QueryFilter[] = [{ field: 'active', value: true }];

            // Mock the response with the count data
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: { count: 5 }
                }),
                status: 200
            });

            const response = await client.count<{ count: number }>(project, table, filters);

            expect(response.success).toBe(true);
            expect(response.data.count).toBeDefined(); // First verify count exists
            expect(response.data.count).toBe(5); // Then check the value
            expect(typeof response.data.count).toBe('number');

            // Verify correct URL and headers
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/count`),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );
        });
    });

    describe('POST Operations', () => {
        test('should insert a single document', async () => {
            const newUser = { name: 'John Doe', email: 'john@example.com' };
            const options = { populate: ['profile'] };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 201,
                    data: {
                        id: '123',
                        ...newUser
                    }
                }),
                status: 201
            });

            const response = await client.insertOne<typeof newUser>(project, table, newUser, options);

            expect(response.success).toBe(true);
            expect(response.status).toBe(201);
            expect(response.data).toEqual(expect.objectContaining({
                id: expect.any(String),
                name: newUser.name,
                email: newUser.email
            }));

            // Verify correct URL, method, headers and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/insertOne`),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(newUser),
                })
            );
        });

        test('should insert multiple documents', async () => {
            const newUsers = [
                { name: 'John Doe', email: 'john@example.com' },
                { name: 'Jane Smith', email: 'jane@example.com' },
            ];

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 201,
                    data: newUsers.map((user, index) => ({
                        id: `user-${index + 1}`,
                        ...user
                    }))
                }),
                status: 201
            });

            const response = await client.insertMany<any[]>(project, table, newUsers);

            expect(response.success).toBe(true);
            expect(response.status).toBe(201);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBe(newUsers.length);
            expect(response.data[0].id).toBeDefined();
            expect(response.data[0].name).toBe(newUsers[0].name);

            // Verify correct URL, method, headers and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/insertMany`),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(newUsers),
                })
            );
        });

        test('should upsert a document', async () => {
            const filters: QueryFilter[] = [{ field: 'email', value: 'john@example.com' }];
            const userData = { name: 'John Doe Updated', email: 'john@example.com' };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        id: 'user-123',
                        ...userData
                    }
                }),
                status: 200
            });

            const response = await client.upsert<typeof userData>(project, table, filters, userData);

            expect(response.success).toBe(true);
            expect(response.data).toEqual(expect.objectContaining({
                id: expect.any(String),
                name: userData.name,
                email: userData.email
            }));

            // Verify correct URL, method, filters, and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/upsert`),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(userData),
                })
            );
        });
    });

    describe('PUT Operations', () => {
        test('should replace a document', async () => {
            const filters: QueryFilter[] = [{ field: 'id', value: '123' }];
            const userData = { name: 'John Doe Replaced', email: 'john@example.com' };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        id: '123',
                        ...userData
                    }
                }),
                status: 200
            });

            const response = await client.replaceOne<typeof userData>(project, table, filters, userData);

            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('id');
            expect(response.data.name).toBe(userData.name);

            // Verify correct URL, method, and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/replaceOne`),
                expect.objectContaining({
                    method: 'PUT',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(userData),
                })
            );
        });

        test('should find and replace a document', async () => {
            const filters: QueryFilter[] = [{ field: 'email', value: 'john@example.com' }];
            const userData = { name: 'John Doe New', email: 'john@example.com' };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        id: '123',
                        ...userData
                    }
                }),
                status: 200
            });

            const response = await client.findOneAndReplace<typeof userData>(project, table, filters, userData);

            expect(response.success).toBe(true);
            expect(response.data).toEqual(expect.objectContaining({
                id: expect.any(String),
                name: userData.name,
                email: userData.email
            }));

            // Verify correct URL, method, and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/findOneAndReplace`),
                expect.objectContaining({
                    method: 'PUT',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(userData),
                })
            );
        });
    });

    describe('PATCH Operations', () => {
        test('should update a single document', async () => {
            const filters: QueryFilter[] = [{ field: 'id', value: '123' }];
            const update = { status: 'active' };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        id: '123',
                        ...update
                    }
                }),
                status: 200
            });

            const response = await client.updateOne<any>(project, table, filters, update);

            expect(response.success).toBe(true);
            expect(response.data.id).toBeDefined();
            expect(response.data.status).toBe(update.status);

            // Verify correct URL, method, and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/updateOne`),
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(update),
                })
            );
        });

        test('should update multiple documents', async () => {
            const filters: QueryFilter[] = [{ field: 'active', value: false }];
            const update = { status: 'inactive' };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        modifiedCount: 5
                    }
                }),
                status: 200
            });

            const response = await client.updateMany<{ modifiedCount: number }>(project, table, filters, update);

            expect(response.success).toBe(true);
            expect(response.data.modifiedCount).toBeDefined();
            expect(response.data.modifiedCount).toBeGreaterThan(0);

            // Verify correct URL, method, and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/updateMany`),
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(update),
                })
            );
        });

        test('should find and update a document', async () => {
            const filters: QueryFilter[] = [{ field: 'email', value: 'john@example.com' }];
            const update = { lastLoginDate: new Date().toISOString() };

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        id: '123',
                        email: 'john@example.com',
                        lastLoginDate: update.lastLoginDate
                    }
                }),
                status: 200
            });

            const response = await client.findOneAndUpdate<any>(project, table, filters, update);

            expect(response.success).toBe(true);
            expect(response.data.id).toBeDefined();
            expect(response.data.lastLoginDate).toBeDefined();

            // Verify correct URL, method, and body
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/findOneAndUpdate`),
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    }),
                    body: JSON.stringify(update),
                })
            );
        });
    });

    describe('DELETE Operations', () => {
        test('should delete a document by ID', async () => {
            const filters: QueryFilter[] = [{ field: 'id', value: '123' }];

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        id: '123',
                        deleted: true
                    }
                }),
                status: 200
            });

            const response = await client.deleteById<any>(project, table, filters);

            expect(response.success).toBe(true);
            expect(response.data.id).toBeDefined();

            // Verify correct URL and method
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/delete`),
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );
        });

        test('should delete many documents', async () => {
            const filters: QueryFilter[] = [{ field: 'active', value: false }];

            // Mock the response with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({
                    success: true,
                    status: 200,
                    data: {
                        deletedCount: 5
                    }
                }),
                status: 200
            });

            const response = await client.deleteMany<{ deletedCount: number }>(project, table, filters);

            expect(response.success).toBe(true);
            expect(response.data.deletedCount).toBeDefined();
            expect(response.data.deletedCount).toBeGreaterThan(0);

            // Verify correct URL and method
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/deleteMany`),
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'mock-csrf-token'
                    })
                })
            );
        });

        test('should find and delete a document', async () => {
            const filters: QueryFilter[] = [{ field: 'email', value: 'john@example.com' }];

            const response = await client.findOneAndDelete<any>(project, table, filters);

            expect(response.success).toBe(true);
            expect(response.data.id).toBeDefined();

            // Verify correct URL and method
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${project}/${table}/findOneAndDelete`),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle request failure', async () => {
            // Override the mock to simulate a failed request
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    headers: {
                        get: jest.fn().mockReturnValue(null)
                    },
                    json: () => Promise.resolve({
                        success: false,
                        status: 404,
                        message: 'Resource not found',
                        data: null
                    })
                })
            );

            // Expect the client to throw an error
            await expect(client.findById(project, 'nonexistent', [{ field: 'id', value: 'invalid' }]))
                .rejects.toEqual(expect.objectContaining({
                    success: false,
                    status: 404,
                    message: 'Resource not found'
                }));
        });

        test('should handle network error', async () => {
            // Override the mock to simulate a network error
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                Promise.reject(new Error('Network error'))
            );

            // Expect the client to throw an error with standard error format
            await expect(client.find(project, table, []))
                .rejects.toEqual({
                    success: false,
                    status: 500,
                    message: 'Network error'
                });
        });
    });

    describe('Query Parameters and Filters', () => {
        test('should correctly send query filters', async () => {
            const filters: QueryFilter[] = [
                { field: 'active', value: true },
                { field: 'role', value: 'admin' }
            ];

            await client.find(project, table, filters);

            // Get the last call which should be the actual find request, not the CSRF token request
            const calls = (global.fetch as jest.Mock).mock.calls;
            const lastCall = calls[calls.length - 1];
            const url = lastCall[0];

            expect(url).toContain(`${project}/${table}/find`);
            expect(url).toContain('filter=');
            const encodedFilter = encodeURIComponent(JSON.stringify(filters));
            expect(url).toContain(encodedFilter);
        });

        test('should correctly send query options', async () => {
            const options = {
                skip: 10,
                limit: 20,
                populate: ['profile', 'posts'],
                query: { createdAt: { $gt: '2023-01-01' } }
            };

            await client.find(project, table, undefined, options);

            // Get the last call which should be the actual find request
            const calls = (global.fetch as jest.Mock).mock.calls;
            const lastCall = calls[calls.length - 1];
            const requestInit = lastCall[1];

            expect(requestInit.headers).toBeDefined();
            const xQueryHeader = requestInit.headers['x-query'];
            expect(xQueryHeader).toBeDefined();

            const queryHeader = JSON.parse(xQueryHeader);
            expect(queryHeader['x-populate']).toEqual(options.populate);
            expect(queryHeader['x-skip']).toBe(options.skip);
            expect(queryHeader['x-limit']).toBe(options.limit);
            expect(queryHeader['x-query']).toEqual(options.query);
        });
    });
});