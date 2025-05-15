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

import { HosbyClient } from '../../src';
import { QueryFilter } from '../../src/types';

/**
 * This file demonstrates how to mock API requests when using the Hosby Client.
 * These examples show different approaches for mocking:
 * 1. Global fetch mocking for all tests
 * 2. Individual test mocking
 * 3. Mock factory approach
 * 4. Response customization based on request parameters
 */

// Example model interfaces
interface User {
    id: string;
    name: string;
    email: string;
    active: boolean;
    profile?: UserProfile;
}

interface UserProfile {
    avatar: string;
    bio: string;
}

// APPROACH 1: Global mock setup
// Mock fetch globally
global.fetch = jest.fn();

describe('MockingRequests Example - Global Mocking', () => {
    // Define test client and config
    let client: HosbyClient;

    beforeAll(() => {
        // Set up default mock response for CSRF token fetch
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            headers: new Headers({
                'X-CSRF-Token': 'mock-csrf-token'
            }),
            json: async () => ({
                success: true,
                data: { token: 'mock-csrf-token' }
            }),
            status: 200
        });
    });

    beforeEach(async () => {
        // Create a new client for each test
        client = new HosbyClient({
            baseURL: 'https://api.hosby.com',
            privateKey: 'test-private-key',
            apiKeyId: 'test-public-key-id',
            projectId: 'test-project-id',
            projectName: 'testproject',
            userId: 'test-user-id'
        });

        // Initialize client
        await client.init();

        // Reset the fetch mock to track calls in individual tests
        (global.fetch as jest.Mock).mockReset();
    });

    test('Example 1: Simple mocking of fetch', async () => {
        // Mock a successful API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: new Headers({
                'X-CSRF-Token': 'mock-csrf-token'
            }),
            json: async () => ({
                success: true,
                status: 200,
                message: 'User found',
                data: {
                    id: '123',
                    name: 'Test User',
                    email: 'test@example.com',
                    active: true
                }
            }),
            status: 200
        });

        // Call the API
        const response = await client.findById<User>(
            'users',
            [{ field: 'id', value: '123' }]
        );

        // Verify the response
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('123');
        expect(response.data.name).toBe('Test User');

        // Verify correct URL was called with proper format
        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.hosby.com/testproject/users/findById/?id=123",
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-api-key': 'test-public-key-id_test-project-id_test-user-id',
                    'X-CSRF-Token': 'mock-csrf-token',
                    'x-signature': 'mocked-signature',
                    'x-timestamp': expect.any(String)
                }),
                method: 'GET',
                'credentials': 'include',
                'mode': 'cors'
            })
        );
    });
});

// APPROACH 2: Mock Factory
// Create a factory to generate standardized mocks
describe('MockingRequests Example - Mock Factory', () => {
    // Mock factory for creating standardized response mocks
    const createMockResponse = <T>(
        success: boolean = true,
        status: number = 200,
        message: string = 'Success',
        data: T | null = null
    ) => {
        return {
            ok: success,
            status,
            headers: new Headers({
                'X-CSRF-Token': 'mock-csrf-token'
            }),
            json: async () => ({
                success,
                status,
                message,
                data
            })
        };
    };

    let client: HosbyClient;

    beforeEach(async () => {
        // Reset the global fetch mock
        (global.fetch as jest.Mock).mockReset();

        // Mock the CSRF token fetch first
        (global.fetch as jest.Mock).mockResolvedValueOnce(
            createMockResponse(true, 200, 'Token fetched', { token: 'mock-csrf-token' })
        );
        // Create and initialize client
        client = new HosbyClient({
            baseURL: 'https://api.hosby.com',
            privateKey: 'test-private-key',
            projectId: 'test-project-id',
            projectName: 'testproject',
            apiKeyId: 'test-api-key',
            userId: 'test-user-id'
        });

        await client.init();
    });

    test('Example 3: Using mock factory for collection response', async () => {
        // Sample data for mock response
        const mockUsers: User[] = [
            {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                active: true
            },
            {
                id: '2',
                name: 'Jane Smith',
                email: 'jane@example.com',
                active: false
            }
        ];

        // Use the factory to create a mock response
        (global.fetch as jest.Mock).mockResolvedValueOnce(
            createMockResponse(true, 200, 'Users found', mockUsers)
        );

        // Call the API
        const response = await client.find<User[]>('users');

        // Verify the response
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockUsers);
        expect(response.data.length).toBe(2);
    });

    test('Example 4: Using mock factory for custom status codes', async () => {
        // Mock a created response (201)
        (global.fetch as jest.Mock).mockResolvedValueOnce(
            createMockResponse(true, 201, 'User created', {
                id: 'new-id',
                name: 'New User',
                email: 'new@example.com',
                active: true
            })
        );

        // Call the API to create a user
        const newUser = {
            name: 'New User',
            email: 'new@example.com',
            active: true
        };

        const response = await client.insertOne<User>('users', newUser);

        // Verify the response
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data.id).toBe('new-id');
    });
});

// APPROACH 3: Request-dependent Responses
describe('MockingRequests Example - Dynamic Response Based on Request', () => {
    let client: HosbyClient;

    beforeEach(async () => {
        // Reset the fetch mock
        (global.fetch as jest.Mock).mockReset();

        // Mock the CSRF token fetch
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: new Headers({
                'X-CSRF-Token': 'mock-csrf-token'
            }),
            json: async () => ({ success: true, data: { token: 'mock-csrf-token' } }),
            status: 200
        });
        // Create and initialize client
        client = new HosbyClient({
            baseURL: 'https://api.hosby.com',
            privateKey: 'test-private-key',
            projectId: 'test-project-id',
            userId: 'test-user-id',
            apiKeyId: 'test-api-key-id',
            projectName: 'testproject'
        });

        await client.init();
    });

    test('Example 5: Respond differently based on request data', async () => {
        // Mock implementation that examines the request and returns a custom response
        (global.fetch as jest.Mock).mockImplementation((url: string, options: RequestInit) => {
            // Parse the URL to determine the endpoint
            const urlString = url.toString();

            // Create mock headers with get() method
            const mockHeaders = {
                get: jest.fn().mockImplementation((name: string) => {
                    const headers: Record<string, string> = {
                        'X-CSRF-Token': 'mock-csrf-token',
                        'authorization': 'Bearer mock-token'
                    };
                    return headers[name.toLowerCase()] || null;
                })
            };

            // Extract filter parameters if present
            let filters: QueryFilter[] = [];
            const parsedUrl = new URL(urlString);
            parsedUrl.searchParams.forEach((value, key) => {
                filters.push({ field: key, value: value });
            });

            // Extract body data for non-GET requests
            let bodyData = {};
            if (options.body) {
                try {
                    bodyData = JSON.parse(options.body.toString());
                } catch (e) {
                    console.error('Error parsing body:', e);
                }
            }

            // Customize response based on the request details
            return Promise.resolve({
                ok: true,
                headers: mockHeaders,
                json: async () => {
                    // Case 1: GET user by ID
                    if (urlString.includes('/findById')) {
                        const idFilter = filters.find(f => f.field === 'id');
                        if (idFilter && idFilter.value === '123') {
                            // Return data for user with ID 123
                            return {
                                success: true,
                                status: 200,
                                message: 'User found',
                                data: {
                                    id: '123',
                                    name: 'John Doe',
                                    email: 'john@example.com',
                                    active: true
                                }
                            };
                        }
                        // User not found - match BaseClient error format
                        return {
                            success: false, // Keep as false for not found responses
                            status: 404,
                            message: 'Resource not found',
                            data: null
                        };
                    }

                    // Case 2: Update user
                    if (urlString.includes('/updateOne') && options.method === 'PATCH') {
                        const idFilter = filters.find(f => f.field === 'id');
                        if (idFilter && idFilter.value === '123') {
                            // Return updated user with merged data
                            return {
                                success: true,
                                status: 200,
                                message: 'User updated',
                                data: {
                                    id: '123',
                                    name: 'John Doe', // Original data
                                    email: 'john@example.com', // Original data
                                    active: true, // Original data
                                    ...bodyData // Merged with update data
                                }
                            };
                        }
                        return {
                            success: false, // Keep as false for not found responses
                            status: 404,
                            message: 'User not found',
                            data: null
                        };
                    }

                    // Default fallback response
                    return {
                        success: true,
                        status: 200,
                        message: 'Operation successful',
                        data: null
                    };
                },
                status: 200
            });
        });

        // Test case 1: Find existing user
        const findResponse = await client.findById<User>(
            'users',
            [{ field: 'id', value: '123' }]
        );
        expect(findResponse.success).toBe(true);
        expect(findResponse.data).toEqual({
            id: '123',
            name: 'John Doe',
            email: 'john@example.com',
            active: true
        });

        // Test case 2: Find non-existent user
        const notFoundResponse = await client.findById<User>(
            'users',
            [{ field: 'id', value: '999' }]
        );

        expect(notFoundResponse.success).toBe(false);
        expect(notFoundResponse.status).toBe(404);
        expect(notFoundResponse?.data).toBe(null);

        // Test case 3: Update user
        const updateResponse = await client.updateOne<User>(
            'users',
            { active: false },
            [{ field: 'id', value: '123' }]
        );

        expect(updateResponse.success).toBe(true);
        expect(updateResponse.data.id).toBe('123');
        expect(updateResponse.data.name).toBe('John Doe');
        expect(updateResponse.data.active).toBe(false);
    });

    // APPROACH 4: Testing real-world scenarios
    describe('MockingRequests Example - Real-world Testing Scenarios', () => {
        let client: HosbyClient;

        beforeEach(async () => {
            // Reset the fetch mock
            (global.fetch as jest.Mock).mockReset();

            // Mock the CSRF token fetch
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({ success: true, data: { token: 'mock-csrf-token' } }),
                status: 200
            });
            // Create and initialize client
            client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                projectName: 'testproject',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id'
            });

            await client.init();
        });

        test('Example 6: Testing CRUD lifecycle for a user', async () => {
            // Sample user data
            const newUser = {
                name: 'Alice Johnson',
                email: 'alice@example.com',
                active: true
            };

            // 1. First mock the POST call to create a user
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({
                    success: true,
                    status: 201,
                    message: 'User created',
                    data: {
                        id: 'user-123',
                        ...newUser,
                        createdAt: new Date().toISOString()
                    }
                }),
                status: 201
            });

            // Create the user
            const createResponse = await client.insertOne<User>('users', newUser);

            expect(createResponse.success).toBe(true);
            expect(createResponse.status).toBe(201);
            expect(createResponse.data.id).toBe('user-123');
            expect(createResponse.data.name).toBe('Alice Johnson');

            const userId = createResponse.data.id;

            // 2. Mock the GET call to fetch the created user
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({
                    success: true,
                    status: 200,
                    message: 'User found',
                    data: createResponse.data // Return the same user
                }),
                status: 200
            });

            // Fetch the user we just created
            const fetchResponse = await client.findById<User>(
                'users',
                [{ field: 'id', value: userId }]
            );

            expect(fetchResponse.success).toBe(true);
            expect(fetchResponse.data.id).toBe(userId);

            // 3. Mock the PATCH call to update the user
            const updateData = {
                name: 'Alice Smith', // Name changed after marriage
                active: true
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({
                    success: true,
                    status: 200,
                    message: 'User updated',
                    data: {
                        ...createResponse.data,
                        ...updateData,
                        updatedAt: new Date().toISOString()
                    }
                }),
                status: 200
            });

            // Update the user
            const updateResponse = await client.updateOne<User>(
                'users',
                updateData,
                [{ field: 'id', value: userId }]        
            );

            expect(updateResponse.success).toBe(true);
            expect(updateResponse.data.name).toBe('Alice Smith');
            expect(updateResponse.data.email).toBe('alice@example.com'); // Unchanged

            // 4. Mock the DELETE call
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({
                    success: true,
                    status: 200,
                    message: 'User deleted',
                    data: updateResponse.data
                }),
                status: 200
            });

            // Delete the user
            const deleteResponse = await client.deleteById<User>(
                'users',
                [{ field: 'id', value: userId }]
            );

            expect(deleteResponse.success).toBe(true);
            expect(deleteResponse.data.id).toBe(userId);

            // 5. Mock the GET call after deletion to verify it's gone
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({
                    success: false,
                    status: 404,
                    message: 'User not found',
                    data: null
                }),
                status: 404
            });

            // Try to fetch the deleted user - should fail with 404
            try {
                await client.findById<User>('users', [{ field: 'id', value: userId }]);
                // If we reach here, the test should fail
                expect(true).toBe(false); // This line should not be reached
            } catch (error: any) {
                expect(error.success).toBe(false);
                expect(error.status).toBe(404);
                expect(error.message).toBe('User not found');
                expect(error.data).toBe(null);
            }
        });

        test('Example 7: Testing error handling and retries', async () => {
            // Mock a network failure first, then success on retry
            (global.fetch as jest.Mock)
                // First call fails with network error
                .mockRejectedValueOnce(new Error('Network failure'))
                // Second call succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Headers({
                        'X-CSRF-Token': 'mock-csrf-token'
                    }),
                    json: async () => ({
                        success: true,
                        status: 200,
                        message: 'Success on retry',
                        data: { id: '123', name: 'Test User' }
                    }),
                    status: 200
                });

            // First attempt should fail with network error
            await expect(
                client.findById<User>('users', [{ field: 'id', value: '123' }])
            ).rejects.toEqual({
                success: false,
                status: 500,
                message: 'Network failure'
            });

            // Reset mock and try again
            (global.fetch as jest.Mock).mockReset();
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Headers({
                    'X-CSRF-Token': 'mock-csrf-token'
                }),
                json: async () => ({
                    success: true,
                    status: 200,
                    message: 'Success on retry',
                    data: { id: '123', name: 'Test User' }
                }),
                status: 200
            });

            // Second attempt should succeed
            const response = await client.findById<User>(
                'users',
                [{ field: 'id', value: '123' }]
            );

            expect(response.success).toBe(true);
            expect(response.data.id).toBe('123');
        });
    });

    // Demonstrate how to use these techniques in a more complex test
    describe('Complex Example - User Authentication Flow', () => {
        let client: HosbyClient;

        beforeEach(async () => {
            // Reset the fetch mock
            (global.fetch as jest.Mock).mockReset();

            // Mock the CSRF token fetch with headers
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: jest.fn().mockReturnValue('mock-csrf-token')
                },
                json: async () => ({ success: true, data: { token: 'mock-csrf-token' } }),
                status: 200
            });
            // Create and initialize client
            client = new HosbyClient({
                baseURL: 'https://api.hosby.com',
                privateKey: 'test-private-key',
                projectId: 'test-project-id',
                userId: 'test-user-id',
                apiKeyId: 'test-api-key-id', // Added missing required property
                projectName: 'testproject' // Added missing required property
            });

            await client.init();
        });

        test('Complete user login flow with validation and error handling', async () => {
            // Mock implementation based on different requests in the flow
            (global.fetch as jest.Mock).mockImplementation((url: string, options: RequestInit) => {
                const urlString = url.toString();
                const method = options.method || 'GET';
                const bodyData = options.body ? JSON.parse(options.body.toString()) : {};

                // Mock response headers with get() method
                const mockHeaders = {
                    get: (name: string) => {
                        const headers = {
                            'authorization': 'Bearer mock-token',
                            'X-CSRF-Token': 'mock-csrf-token'
                        };
                        return headers[name as keyof typeof headers] || null;
                    }
                };

                // 1. User lookup by email
                if (urlString.includes('/findByEmail')) {
                    // Extract email from URL and decode special characters
                    const url = new URL(urlString);
                    const emailParam = url.searchParams.get('email');
                    const decodedEmail = emailParam ? decodeURIComponent(emailParam) : null;

                    // Extract email from query filters
                    const queryFilters = [{ field: 'email', value: decodedEmail }];
                    const emailFilter = queryFilters.find((f: QueryFilter) => f.field === 'email');

                    if (emailFilter && emailFilter.value === 'valid@example.com') {
                        // Return existing user
                        return Promise.resolve({
                            ok: true,
                            headers: mockHeaders,
                            json: async () => ({
                                success: true,
                                status: 200,
                                message: 'User found',
                                data: {
                                    id: 'user-123',
                                    email: 'valid@example.com',
                                    passwordHash: 'hashed-password',
                                    active: true,
                                    loginAttempts: 0
                                }
                            }),
                            status: 200
                        });
                    }

                    // User not found
                    return Promise.resolve({
                        ok: false,
                        headers: mockHeaders,
                        json: async () => ({
                            success: false,
                            status: 404,
                            message: 'User not found',
                            data: null
                        }),
                        status: 404
                    });
                }

                // 2. Update login attempts or last login timestamp
                if (urlString.includes('/updateOne') && method === 'PATCH') {
                    // Check if this is a login success or failure update
                    if (bodyData.lastLoginDate) {
                        // Successful login update
                        return Promise.resolve({
                            ok: true,
                            headers: mockHeaders,
                            json: async () => ({
                                success: true,
                                status: 200,
                                message: 'Login recorded',
                                data: {
                                    id: 'user-123',
                                    email: 'valid@example.com',
                                    active: true,
                                    loginAttempts: 0,
                                    lastLoginDate: bodyData.lastLoginDate
                                }
                            }),
                            status: 200
                        });
                    }

                    // Failed login attempt update
                    return Promise.resolve({
                        ok: true,
                        headers: mockHeaders,
                        json: async () => ({
                            success: true,
                            status: 200,
                            message: 'Login attempts updated',
                            data: {
                                id: 'user-123',
                                email: 'valid@example.com',
                                active: true,
                                loginAttempts: bodyData.loginAttempts
                            }
                        }),
                        status: 200
                    });
                }

                // Default response
                return Promise.resolve({
                    ok: true,
                    headers: mockHeaders,
                    json: async () => ({
                        success: true,
                        status: 200,
                        message: 'Operation successful',
                        data: {}
                    }),
                    status: 200
                });
            });

            // Function to simulate the login process
            const performLogin = async (email: string, password: string): Promise<{ success: boolean; message: string; userId?: string }> => {
                try {
                    // 1. Find user by email
                    const response = await client.findByEmail<User>('users', [
                        { field: 'email', value: email }
                    ]);

                    if (!response.success) {
                        return {
                            success: false,
                            message: 'User not found'
                        };
                    }

                    const user = response.data;

                    // 2. In a real app, you would validate password here
                    // For testing, we'll just check if email is valid
                    if (email === 'valid@example.com' && password === 'hashed-password') {
                        // 3. If valid, update last login timestamp
                        const updateResponse = await client.updateOne<User>(
                            'users',
                            {
                                lastLoginDate: new Date().toISOString(),
                                loginAttempts: 0
                            },
                            [{ field: 'id', value: user.id }]
                        );

                        if (!updateResponse.success) {
                            return {
                                success: false,
                                message: 'Failed to update login timestamp'
                            };
                        }

                        return {
                            success: true,
                            message: 'Login successful',
                            userId: user.id
                        };
                    }

                    // 4. If invalid, increment login attempts
                    const updateResponse = await client.updateOne<User>(
                        'users',
                        { loginAttempts: (user as any).loginAttempts + 1 },
                        [{ field: 'id', value: user.id }]
                    );

                    if (!updateResponse.success) {
                        return {
                            success: false,
                            message: 'Failed to update login attempts'
                        };
                    }

                    return {
                        success: false,
                        message: 'Invalid credentials'
                    };

                } catch (error) {
                    return {
                        success: false,
                        message: 'An error occurred during login'
                    };
                }
            };

            // Test successful login
            const successResult = await performLogin('valid@example.com', 'hashed-password');
            expect(successResult.success).toBe(true);
            expect(successResult.userId).toBe('user-123');

            // Verify the fetch was called with the right parameters
            expect(global.fetch).toHaveBeenCalled();

            // Test failed login - wrong password
            const failedResult1 = await performLogin('valid@example.com', 'wrong-password');
            expect(failedResult1.success).toBe(false); // Fixed: Changed from false to true
            expect(failedResult1.message).toBe('Invalid credentials');

            // Test failed login - user not found
            const failedResult2 = await performLogin('nonexistent@example.com', 'any-password');
            expect(failedResult2.success).toBe(false); // Fixed: Changed from false to true
            expect(failedResult2.message).toBe('An error occurred during login');
        });
    });

    test('CSRF token update and synchronization', async () => {
        // Mock the initial CSRF token fetch
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: {
                get: jest.fn().mockReturnValue('initial-mock-csrf-token')
            },
            json: async () => ({ success: true, data: { token: 'initial-mock-csrf-token' } }),
            status: 200
        });

        const client = new HosbyClient({
            baseURL: 'https://api.hosby.com',
            privateKey: 'test-private-key',
            projectId: 'test-project-id',
            userId: 'test-user-id',
            apiKeyId: 'test-api-key-id',
            projectName: 'testproject'
        });

        await client.init();


        // Verify the cookie value for CSRF token
        const initialCookieValue = (global.document.cookie as string).split('; ').find(row => row.startsWith('hosbyapiservices-X-CSRF-Token='));
        expect(initialCookieValue).toContain('hosbyapiservices-X-CSRF-Token=initial-mock-csrf-token');

        // Mock a new CSRF token fetch
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: {
                get: jest.fn().mockReturnValue('new-mock-csrf-token')
            },
            json: async () => ({ success: true, data: { token: 'new-mock-csrf-token' } }),
            status: 200
        });

        // Simulate a request to update the CSRF token
        await client.init(); // Re-initialize to fetch the new CSRF token

        // Verify that the CSRF token has been updated
        const updatedCookieValue = (global.document.cookie as string).split('; ').find(row => row.startsWith('hosbyapiservices-X-CSRF-Token='));
        expect(updatedCookieValue).toContain('hosbyapiservices-X-CSRF-Token=new-mock-csrf-token');
    });

    test('login and logout', async () => {
        const mockLoginResponse = {
            success: true,
            status: 200,
            message: 'Login successful',
            data: { userId: 'test-user-id' }
        };

        const mockLogoutResponse = {
            success: true,
            status: 200,
            message: 'Logout successful',
            data: null
        };

        // Mock the login response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: {
                get: jest.fn().mockReturnValue('mock-csrf-token') || jest.fn() // Ensure get is defined
            },
            json: async () => mockLoginResponse,
            status: 200
        });

        const authClient = new HosbyClient({
            baseURL: 'https://api.hosby.com',
            privateKey: 'test-private-key',
            projectId: 'test-project-id',
            userId: 'test-user-id',
            apiKeyId: 'test-api-key-id',
            projectName: 'testproject'
        });

        // Test login
        const loginResponse = await authClient.login('test-authenticator', 'users', { username: 'testuser', password: 'password' });
        expect(loginResponse.success).toBe(true);
        expect(loginResponse.message).toBe('Login successful');

        // Mock the logout response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: {
                get: jest.fn().mockReturnValue('mock-csrf-token') || jest.fn() // Ensure get is defined
            },
            json: async () => mockLogoutResponse,
            status: 200
        });

        // Test logout
        const logoutResponse = await authClient.logout('test-authenticator', 'users');
        expect(logoutResponse.success).toBe(true);
        expect(logoutResponse.message).toBe('Logout successful');
    });
});