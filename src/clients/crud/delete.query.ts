import { ApiResponse, QueryFilter, QueryOptions } from "../../types";
import { BaseClient } from "../BaseClient";

export class DeleteQueryClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Delete a single document by filter criteria
     * @template T - Type of document being deleted and returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful 
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: The deleted document matching type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   name: string;
     * }
     * 
     * // Delete a user by email
     * const result = await deleteClient.deleteOne<User>(
     *   'users',
     *   [{ field: 'email', value: 'user@example.com' }]
     * );
     * if (result.success) {
     *   const deletedUser = result.data;
     *   console.log(`Deleted user ${deletedUser.name}`);
     * }
     * 
     * // Delete a document by ID
     * const result = await deleteClient.deleteOne<Document>(
     *   'documents',
     *   [{ field: 'id', value: '123abc' }]
     * );
     * ```
     */
    async deleteOne<T>(
        table: string,
        queryFilters: QueryFilter[]
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table and filters are required');
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `${table}/deleteOne`,
            queryFilters
        );
    }

    /**
     * Delete multiple documents matching filter criteria
     * @template T - Type of the response data, typically { deletedCount: number }
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Boolean indicating if operation succeeded
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: Object with deletedCount indicating number of deleted documents
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface DeleteResult {
     *   deletedCount: number;
     * }
     * 
     * // Delete inactive users created before specific date
     * const result = await deleteClient.deleteMany<DeleteResult>(
     *   'users',
     *   [
     *     { field: 'active', value: false },
     *     { field: 'createdAt', value: new Date('2023-01-01') }
     *   ],
     *   { limit: 1000 }
     * );
     * 
     * if (result.success) {
     *   console.log(`Deleted ${result.data.deletedCount} inactive users`);
     * }
     * ```
     */
    async deleteMany<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table and queryFilters are required');
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `${table}/deleteMany`,
            queryFilters,
            options
        );
    }

    /**
     * Find a document by filter criteria and delete it
     * @template T - Type of the document being deleted and returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned document. Can be a string for a single field or array of strings for multiple fields
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The deleted document of type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   lastLoginDate: Date;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   }
     * }
     * 
     * // Find and delete inactive user by email and populate profile
     * const result = await deleteClient.findOneAndDelete<User>(
     *   'users',
     *   [
     *     { field: 'email', value: 'user@example.com' },
     *     { field: 'active', value: false }
     *   ],
     *   { populate: ['profile'] }
     * );
     * 
     * if (result.success) {
     *   const deletedUser = result.data;
     *   console.log('Deleted user:', deletedUser);
     * }
     * ```
     */
    async findOneAndDelete<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table and queryFilters are required');
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `${table}/findOneAndDelete`,
            queryFilters,
            options
        );
    }

    /**
     * Delete documents by field/value pairs
     * @template T - Type of documents being deleted and returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field and value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete. If not specified, all matching documents will be deleted
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of deleted documents matching type T
     * @throws Error if project, table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   role: string;
     *   status: string;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   }
     * }
     * 
     * // Delete inactive guest users
     * const result = await deleteClient.deleteByField<User[]>(
     *   'users',
     *   [
     *     { field: 'role', value: 'guest' },
     *     { field: 'status', value: 'inactive' }
     *   ],
     *   { limit: 10 }
     * );
     * 
     * if (result.success) {
     *   const deletedUsers = result.data;
     *   console.log(`Deleted ${deletedUsers.length} users with status ${result.status}`);
     * }
     * ```
     */
    async deleteByField<T>(
        table: string,
        queryFilters: QueryFilter[],
        options: { limit?: number } = {}
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table and query filters are required');
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `${table}/deleteByField`,
            queryFilters,
            options
        );
    }

    /**
     * Delete a document by token field and value
     * @template T - Type of document being deleted and returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: The deleted document matching type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   resetPasswordToken?: string;
     * }
     * 
     * // Delete user by reset password token
     * const response = await deleteClient.deleteByToken<User>(
     *   'users',
     *   [{ field: 'resetPasswordToken', value: 'abc123xyz' }],
     *   { limit: 1 }
     * );
     * 
     * if (response.success) {
     *   const deletedUser = response.data;
     *   console.log(`Deleted user with token, status: ${response.status}`);
     * }
     * ```
     */
    async deleteByToken<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error(`Table and query filter ' token ' are required`);
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `$${table}/deleteByToken`,
            queryFilters,
            options
        );
    }

    /**
     * Delete a document by its ID
     * @template T - Type of the document being deleted and returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: The deleted document matching type T
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface Document {
     *   id: string;
     *   title: string;
     *   content: string;
     * }
     * 
     * // Delete document by ID
     * const response = await deleteClient.deleteById<Document>(
     *   'documents', 
     *   [{ field: 'id', value: '507f1f77bcf86cd799439011' }]
     * );
     * 
     * if (response.success) {
     *   const deletedDoc = response.data;
     *   console.log(`Deleted document "${deletedDoc.title}" with status ${response.status}`);
     * }
     * ```
     */
    async deleteById<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!!table || !queryFilters?.length) {
            throw new Error(`Table and query filter ' id ' are required`);
        }

        return this.baseClient['request']<T>(
            'DELETE',
            `${table}/delete`,
            queryFilters,
            options
        );
    }
}