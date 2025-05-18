import { BaseClient } from '../BaseClient';
import { ApiResponse, QueryFilter } from '../../types';

export class BulkQueryClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Perform bulk insert operations on documents
     * @template T - Type of the returned documents array
     * @template D - Type of documents being inserted (defaults to unknown)
     * @param table - Name of the table/collection
     * @param payload - Array of documents to insert. Each document should match type D
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether insert was successful (true/false)
     *   - status: HTTP status code (201 for success)
     *   - message: Response message describing the result
     *   - data: Array of inserted documents of type T
     * @throws Error if table or data array is missing/empty
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
     * // Insert multiple users
     * const result = await bulkClient.bulkInsert<User[], User[]>(
     *   'users',
     *   [
     *     { name: 'John', email: 'john@example.com' },
     *     { name: 'Jane', email: 'jane@example.com' }
     *   ]
     * );
     * ```
     */
    async bulkInsert<T, D = unknown>(
        table: string,
        payload: D[],
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !payload?.length) {
            throw new Error('Table and data array are required');
        }

        return this.baseClient['request']<T>(
            'POST',
            `${table}/bulkInsert`,
            undefined,
            undefined,
            payload
        );
    }

    /**
     * Perform bulk update operations on documents
     * @template T - Type of the returned documents array
     * @template D - Type of update data (defaults to unknown)
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying
     * @param data - Data to update the documents with
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether update was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of updated documents of type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   status: string;
     *   lastModified: Date;
     * }
     * 
     * // Update status for multiple users
     * const result = await bulkClient.bulkUpdate<User[], { status: string }>(
     *   'users',
     *   { status: 'active', lastModified: new Date() },    
     *   [
     *     { field: 'role', value: 'user' },
     *     { field: 'active', value: true }
     *   ],
     * );
     * ```
     */
    async bulkUpdate<T, D = unknown>(
        table: string,
        data: D,
        queryFilters?: QueryFilter[]
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required and must be a string');
        }

        return this.baseClient['request']<T>(
            'PUT',
            `${table}/bulkUpdate`,
            queryFilters,
            undefined,
            data
        );
    }

    /**
     * Perform bulk delete operations on documents
     * @template T - Type of the returned documents array
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether delete was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of deleted documents of type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   name: string;
     *   email: string;
     * }
     * 
     * // Delete multiple users by role
     * const result = await bulkClient.bulkDelete<User[]>(
     *   'users',
     *   [{ field: 'role', value: 'inactive' }]
     * );
     * ```
     */
    async bulkDelete<T>(
        table: string,
        queryFilters: QueryFilter[]
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required and must be a string');
        }

        if (!queryFilters?.length) {
            throw new Error('At least one filter is required for bulk delete');
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `${table}/bulkDelete`,
            queryFilters
        );
    }
}
