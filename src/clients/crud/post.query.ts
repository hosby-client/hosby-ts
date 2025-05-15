import { ApiResponse, QueryFilter, QueryOptions } from "../../types";
import { BaseClient } from "../BaseClient";

export class PostQueryClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Insert a single document
     * @template T - Type of the returned document
     * @template D - Type of the data to insert (defaults to unknown)
     * @param table - Name of the table/collection
     * @param payload - Document to insert. Should match type D
     * @param options - Additional query options
     * @param options.populate - Array of field paths to populate in the returned document
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether insert was successful (true/false)
     *   - status: HTTP status code (201 for success)
     *   - message: Response message describing the result
     *   - data: The inserted document of type T
     * @throws Error if project, table or data is missing
     * @example
     * ```typescript
     * interface UserInput {
     *   id: string;
     *   name: string;
     *   email: string;
     *   profile?: {
     *     avatar: string;
     *     bio: string;
     *   }
     * }
     * 
     * type UserReturn = Omit<UserInput, 'id'>; // Type for input data without id
     * 
     * // Insert new user and populate profile
     * const result = await postClient.insertOne<UserReturn, UserInput>(
     *   'users',
     *   { 
     *     name: 'John Doe',
     *     email: 'john@example.com',
     *     profile: {
     *       avatar: 'avatar.jpg',
     *       bio: 'Software developer'
     *     }
     *   },
     *   { populate: ['profile'] }
     * );
     * 
     * if (result.success) {
     *   const newUser = result.data;
     *   console.log('Created user:', newUser);
     * }
     * ```
     */
    async insertOne<T, D = unknown>(
        table: string,
        payload: D,
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !payload) {
            throw new Error('Table and data are required');
        }

        return this.baseClient['request']<T>(
            'POST',
            `${table}/insertOne`,
            undefined,
            options,
            payload
        );
    }

    /**
     * Insert multiple documents into a table/collection
     * @template T - Type of the returned documents array
     * @template D - Type of documents being inserted (defaults to unknown)
     * @param table - Name of the table/collection
     * @param payload - Array of documents to insert. Each document should match type D
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned documents. Can be a string for a single field or array of strings for multiple fields
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether insert was successful (true/false)
     *   - status: HTTP status code (201 for success)
     *   - message: Response message describing the result
     *   - data: Array of inserted documents of type T
     * @throws Error if project, table or data array is missing/empty
     * @example
     * ```typescript
     * interface UserReturn {
     *   id: string;
     *   name: string;
     *   email: string;
     *   profile?: {
     *     avatar: string;
     *     bio: string;
     *   }
     * }
     *  
     * type UserInput = Omit<User, 'id'>; // Type for input data without id
     *
     * // Insert multiple users and populate profiles
     * const result = await postClient.insertMany<UserReturn[], UserInput[]>(
     *   'users',
     *   [
     *     { 
     *       name: 'John Doe',
     *       email: 'john@example.com',
     *       profile: { avatar: 'john.jpg', bio: 'Developer' }
     *     },
     *     {
     *       name: 'Jane Smith', 
     *       email: 'jane@example.com',
     *       profile: { avatar: 'jane.jpg', bio: 'Designer' }
     *     }
     *   ],
     *   { populate: ['profile'] }
     * );
     * 
     * if (result.success) {
     *   const users = result.data;
     *   console.log('Created users:', users);
     * }
     * ```
     */
    async insertMany<T, D = unknown>(
        table: string,
        payload: D[],
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !payload) {
            throw new Error('Table and data are required');
        }

        return this.baseClient['request']<T>(
            'POST',
            `${table}/insertMany`,
            undefined,
            options,
            payload
        );
    }

    /**
     * Updates a document if it exists, otherwise creates a new one
     * @template T - Type of the returned document
     * @template D - Type of the update/insert data (defaults to unknown)
     * @param table - Name of the table/collection
     * @param filters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param data - Data to update/insert. Should match type D
     * @param options - Additional query options
     * @param options.populate - Array of field paths to populate in the returned document
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether upsert was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The upserted document of type T
     * @throws Error if project, table or filters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   name: string;
     *   profile?: {
     *     avatar: string;
     *     bio: string;
     *   }
     * }    
     * 
     * // Example of using generic types
     * type UserInput = Omit<User, 'id'>; // Type for input data without id
     * 
     * // Upsert user by email and populate profile
     * const result = await postClient.upsert<User, UserInput>(
     *   'users',
     *   { 
     *     name: 'John Doe',
     *     email: 'user@example.com',
     *     profile: {
     *       avatar: 'avatar.jpg',
     *       bio: 'Software Developer'
     *     }
     *   },
     *   [{ field: 'email', value: 'user@example.com' }],
     *   { populate: ['profile'] }
     * );
     * 
     * if (result.success) {
     *   const user = result.data;
     *   console.log('Upserted user:', user);
     * }
     * ```
     */
    async upsert<T, D = unknown>(
        table: string,
        payload: D,
        filters: QueryFilter[],
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required and must be a string');
        }

        if (!filters?.length) {
            throw new Error('At least one filter is required for upsert');
        }

        return this.baseClient['request']<T>(
            'POST',
            `${table}/upsert`,
            filters,
            options,
            payload
        );
    }
}