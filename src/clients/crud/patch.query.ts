import { ApiResponse, QueryFilter, QueryOptions } from "../../types";
import { BaseClient } from "../BaseClient";

export class PatchQueryClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Update a single document by filter criteria
     * @template T - Type of the returned document
     * @template D - Type of the update data (defaults to unknown)
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param data - Data to update the document with. Should match type D
     * @param options - Additional query options
     * @param options.populate - Array of field paths to populate in the returned document
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether update was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The updated document of type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   status: string;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   }
     * }
     * 
     * interface UserUpdate {
     *   status: string;
     * }
     * 
     * // Update user by email and populate profile
     * const result = await patchClient.updateOne<User, UserUpdate>(
     *   'users', 
     *   [{ field: 'email', value: 'user@example.com' }],
     *   { status: 'active' },
     *   { populate: ['profile'] }
     * );
     * 
     * // Update document by ID
     * const result = await patchClient.updateOne<Document>(
     *   'documents',
     *   [{ field: 'id', value: '123abc' }],
     *   { title: 'Updated Title' }
     * );
     * ```
     */
    async updateOne<T, D = unknown>(
        table: string,
        queryFilters: QueryFilter[],
        data: D,
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !queryFilters?.length) {
            throw new Error('Table and filters are required');
        }

        return this.baseClient['request']<T>(
            'PATCH',
            `${table}/updateOne`,
            queryFilters,
            options,
            data
        );
    }

    /**
     * Update multiple documents matching filter criteria
     * @param table - Name of the table/collection 
     * @param filters - Array of filter criteria for querying. Each filter should have field and value properties
     * @param data - Data to update the documents with. Can be a partial object containing only fields to update
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned documents. Can be a string for a single field or array of strings for multiple fields
     * @param options.limit - Maximum number of documents to update. If not specified, all matching documents will be updated
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether update was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Object containing modifiedCount indicating number of documents that were updated
     * @throws Error if project or table is missing
     * @example
     * ```typescript
     * // Define the update data shape
     * interface UserUpdate {
     *   status: string;
     *   tags: string[];
     *   lastModified: Date;
     * }
     * 
     * // Define the response type containing modifiedCount
     * interface UpdateResponse {
     *   modifiedCount: number;
     * }
     * 
     * // Update status and add tags for inactive users
     * // T = UpdateResponse (return type), UserUpdate (data type)
     * const result = await patchClient.updateMany<UpdateResponse, UserUpdate>(
     *   'users',
     *   [
     *     { field: 'active', value: false },
     *     { field: 'role', value: 'user' }
     *   ],
     *   { 
     *     status: 'archived',
     *     tags: ['inactive', 'archived'],
     *     lastModified: new Date()
     *   },
     *   { limit: 100 }
     * );
     * console.log(`Updated ${result.data.modifiedCount} documents`);
     * ```
     */
    async updateMany<T, D = unknown>(
        table: string,
        filters: QueryFilter[],
        data: D,
        options?: Pick<QueryOptions, 'populate' | 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required and must be a string');
        }

        return this.baseClient['request']<T>(
            'PATCH',
            `${table}/updateMany`,
            filters,
            options,
            data
        );
    }

    /**
     * Find a document by filter criteria and update it
     * @param table - Name of the table/collection 
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param data - Data to update the document with
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned document. Can be a string for a single field or array of strings for multiple fields
     * @returns Promise resolving to ApiResponse containing the updated document
     * @template T - Type of the document being updated and returned
     * @template D - Type of the update data, defaults to unknown if not specified
     * @throws Error if table or queryFilters are missing or empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   lastLoginDate: Date;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   };
     *   settings?: {
     *     notifications: boolean;
     *     theme: string;
     *   };
     * }
     * 
     * interface UserUpdate {
     *   lastLoginDate: Date;
     * }
     * 
     * // Find and update user by email
     * const result = await patchClient.findOneAndUpdate<User, UserUpdate>(
     *   'users',
     *   [{ field: 'email', value: 'user@example.com' }],
     *   { lastLoginDate: new Date() },
     *   { populate: ['profile', 'settings'] }
     * );
     * 
     * if (result.success) {
     *   const updatedUser = result.data as User;
     *   console.log('Updated user:', updatedUser);
     * }
     * ```
     */
    async findOneAndUpdate<T, D = unknown>(
        table: string,
        queryFilters: QueryFilter[],
        data: D,
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !queryFilters.length) {
            throw new Error('Table and queryFilters are required');
        }

        return this.baseClient['request']<T>(
            'PATCH',
            `${table}/findOneAndUpdate`,
            queryFilters,
            options,
            data
        );
    }
}