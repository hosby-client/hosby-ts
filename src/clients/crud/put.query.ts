import { ApiResponse, QueryFilter, QueryOptions } from "../../types";
import { BaseClient } from "../BaseClient";

export class PutQueryClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Replace a document completely with new data
     * @template T - Type of the returned document
     * @template D - Type of the replacement data (defaults to unknown)
     * @param table - Name of the table/collection 
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param payload - New document data to replace with. Should match type D
     * @param options - Additional query options
     * @param options.populate - Array of field paths to populate in the returned document
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether replace was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The replaced document of type T
     * @throws Error if project, table or queryFilters are missing/empty
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
     * type UserPayload = Omit<UserReturn, 'id'>; // Type for input data without id
     * 
     * // Replace user document by ID and populate profile
     * const result = await putClient.replaceOne<UserReturn, UserPayload>(
     *   'users',
     *   { 
     *     name: 'New Name',
     *     email: 'new@example.com',
     *     profile: {
     *       avatar: 'new.jpg',
     *       bio: 'Updated bio'
     *     }
     *   },
     *   [{ field: 'id', value: '507f1f77bcf86cd799439011' }],
     *   { populate: ['profile'] }
     * );
     * ```
     */
    async replaceOne<T, D = unknown>(
        table: string,
        payload: D,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !queryFilters.length) {
            throw new Error('Table and queryFilters are required');
        }

        return this.baseClient['request']<T>(
            'PUT',
            `${table}/replaceOne`,
            queryFilters,
            options,
            payload
        );
    }

    /**
     * Find a document by filter criteria and replace it with new data
     * @template T - Type of the returned document
     * @template D - Type of the replacement data (defaults to unknown)
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param payload - New document data to replace with. Should match type D
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned document. Can be a string for a single field or array of strings for multiple fields
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether replace was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The replaced document of type T
     * @throws Error if project, table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   name: string;
     *   email: string;
     *   profile?: {
     *     avatar: string;
     *     bio: string;
     *   }
     * }
     * 
     * // Find and replace user by email and populate profile
     * const result = await putClient.findOneAndReplace<User>(
     *   'users',
     *   { 
     *     name: 'New Name',
     *     email: 'user@example.com',
     *     profile: {
     *       avatar: 'new.jpg',
     *       bio: 'Updated bio'
     *     }
     *   },
     *   [{ field: 'email', value: 'user@example.com' }],
     *   { populate: ['profile'] }
     * );
     * 
     * if (result.success) {
     *   const replacedUser = result.data;
     *   console.log('Replaced user:', replacedUser);
     * }
     * ```
     */
    async findOneAndReplace<T, D = unknown>(
        table: string,
        payload: D,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required and must be a string');
        }

        if (!queryFilters?.length) {
            throw new Error('At least one filter is required for findOneAndReplace');
        }

        return this.baseClient['request']<T>(
            'PUT',
            `${table}/findOneAndReplace`,
            queryFilters,
            options,
            payload
        );
    }
}