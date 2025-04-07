import { ApiResponse, QueryFilter, QueryOptions } from "../../types";
import { BaseClient } from "../BaseClient";

export class GetQueryClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Find multiple documents based on filter criteria
     * @template T - Type of documents to return, typically an array type like User[]
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.populate - Array of field paths to populate in the response. Each path should be a dot-notation string
     * @param options.skip - Number of documents to skip for pagination
     * @param options.limit - Maximum number of documents to return in response
     * @param options.query - Advanced query conditions using MongoDB-style operators ($eq, $gt, etc)
     * @param options.slice - Array field slicing parameters to limit array sizes in response
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Boolean indicating if operation succeeded
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: Array of found documents matching type T
     * @throws Error if table parameters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   active: boolean;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   };
     *   posts?: Array<{
     *     id: string;
     *     title: string;
     *   }>;
     *   createdAt: Date;
     * }
     * 
     * // Find active users with pagination and populated relations
     * const response = await getClient.find<User[]>(
     *   'users',
     *   [{ field: 'active', value: true }],
     *   { 
     *     limit: 10,
     *     skip: 0,
     *     populate: ['profile', 'posts'],
     *     query: {
     *       createdAt: { $gt: '2023-01-01' }
     *     },
     *     slice: { posts: 5 } // Only return first 5 posts
     *   }
     * );
     * 
     * if (response.success) {
     *   const users = response.data as User[];
     *   users.forEach(user => {
     *     console.log(`${user.profile?.name}: ${user.posts?.length} posts`);
     *   });
     * }
     * ```
     */
    async find<T>(
        table: string,
        queryFilters?: QueryFilter[],
        options?: QueryOptions
    ): Promise<ApiResponse<T>> {
        if (!table) {
            throw new Error('Table name is required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/find`,
            queryFilters,
            options
        );
    }


    /**
     * Find a document by ID
     * @template T - Type of the document being returned
     * @param table - Name of the table/collection 
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties. 
     *                      Must include an '_id' field filter with the document ID to find.
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether operation was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The found document of type T, or null if not found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface Document {
     *   id: string;
     *   title: string;
     *   content: string;
     *   author: string;
     * }
     * 
     * // Find document by ID
     * const result = await getClient.findById<Document>(
     *   'documents',
     *   [{ field: 'id', value: '507f1f77bcf86cd799439011' }]
     * );
     * 
     * if (result.success) {
     *   const doc = result.data as Document;
     *   console.log('Found document:', doc.title);
     * }
     * ```
     */
    async findById<T>(
        table: string,
        queryFilters: QueryFilter[]
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table name and query filters are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findById`,
            queryFilters
        );
    }

    /**
     * Find a document by email field
     * @template T - Type of the document being returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties.
     *                      Must include an 'email' field filter with the email address to find.
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether operation was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The found document of type T, or null if not found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   name: string;
     *   status: string;
     * }
     * 
     * // Find user by email
     * const result = await getClient.findByEmail<User>(
     *   'users',
     *   [{ field: 'email', value: 'user@example.com' }]
     * );
     * 
     * if (result.success) {
     *   const user = result.data as User;
     *   console.log('Found user:', user.name);
     * }
     * ```
     */
    async findByEmail<T>(
        table: string,
        queryFilters: QueryFilter[],
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error(`Table name and filter 'Email' required`);
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findByEmail`,
            queryFilters
        );
    }

    /**
     * Find a document by a specific token field
     * @template T - Type of the document being returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties.
     *                      Must include a token field filter with the token value to find.
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned document. Can be a string for a single field 
     *                          or array of strings for multiple fields
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether operation was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The found document of type T, or null if not found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   resetPasswordToken?: string;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   }
     * }
     * 
     * // Find user by reset password token and populate profile
     * const result = await getClient.findByToken<User>(
     *   'users',
     *   [{ field: 'resetPasswordToken', value: 'abc123xyz' }],
     *   { populate: ['profile'] }
     * );
     * 
     * if (result.success) {
     *   const user = result.data as User;
     *   console.log('Found user:', user);
     * }
     * ```
     */
    async findByToken<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error(`Table name and 'Token' is required`);
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findByToken`,
            queryFilters,
            options
        );
    }

    /**
     * Find documents by a specific field value
     * @template T - Type of the documents being returned
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned documents. Can be a string for a single field or array of strings for multiple fields
     * @param options.limit - Maximum number of documents to return. If not specified, returns all matching documents
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether operation was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of found documents of type T, or empty array if none found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   role: string;
     *   profile?: {
     *     name: string;
     *     avatar: string;
     *   }
     * }
     * 
     * // Find admin users and populate their profiles
     * const result = await getClient.findByField<User[]>(
     *   'users',
     *   [{ field: 'role', value: 'admin' }],
     *   { 
     *     populate: ['profile'],
     *     limit: 10 
     *   }
     * );
     * 
     * if (result.success) {
     *   const users = result.data as User[];
     *   console.log('Found admin users:', users);
     * }
     * ```
     */
    async findByField<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'populate' | 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table name and query filters are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findByField`,
            queryFilters,
            options
        );
    }

    /**
     * Find documents where a field is greater than a value
     * @template T - Type of documents being queried
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of records to return
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether query was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of found documents of type T, or empty array if none found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   age: number;
     *   name: string;
     *   email: string;
     * }
     * 
     * // Find adult users
     * const result = await getClient.findGreaterThan<User[]>(
     *   'users',
     *   [{ field: 'age', value: 18 }],
     *   { limit: 100 }
     * );
     * 
     * if (result.success) {
     *   const users = result.data as User[];
     *   console.log(`Found ${users.length} adult users`);
     * }
     * ```
     */
    async findGreaterThan<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table name and query filters are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findGreaterThan`,
            queryFilters,
            options
        );
    }

    /**
     * Find documents where fields are less than specified values
     * @template T - Type of documents being queried
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of records to return
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether query was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of found documents of type T, or empty array if none found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface Product {
     *   id: string;
     *   name: string;
     *   price: number;
     *   stock: number;
     * }
     * 
     * // Find products with price less than 100 and stock less than 50
     * const result = await getClient.findLessThan<Product[]>(
     *   'products',
     *   [
     *     { field: 'price', value: 100 },
     *     { field: 'stock', value: 50 }
     *   ],
     *   { limit: 10 }
     * );
     * 
     * if (result.success) {
     *   const products = result.data as Product[];
     *   console.log(`Found ${products.length} matching products`);
     * }
     * ```
     */
    async findLessThan<T>(
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table name and query filters are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findLessThan`,
            queryFilters,
            options
        );
    }

    /**
     * Find documents where fields exactly match specified values
     * @template T - Type of documents to return
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of records to return
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether query was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of found documents of type T, or empty array if none found
     * @throws Error if table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   email: string;
     *   status: string;
     *   role: string;
     * }
     * 
     * // Find active admin users
     * const result = await getClient.findEqual<User[]>(
     *   'users',
     *   [
     *     { field: 'status', value: 'active' },
     *     { field: 'role', value: 'admin' }
     *   ],
     *   { limit: 10 }
     * );
     * 
     * if (result.success) {
     *   const users = result.data as User[];
     *   console.log(`Found ${users.length} active admin users`);
     * }
     * ```
     */
    async findEqual<T>(
        project: string,
        table: string,
        queryFilters: QueryFilter[],
        options?: Pick<QueryOptions, 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table name and query filters are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findEqual`,
            queryFilters,
            options
        );
    }

    /**
     * Find documents and populate referenced fields
     * @template T - Type of the returned documents
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Query options including populate fields, skip and limit
     * @param options.populate - Array of field paths to populate in the response. Required.
     * @param options.skip - Number of records to skip (optional)
     * @param options.limit - Maximum number of records to return (optional)
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether query was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of found and populated documents of type T
     * @throws Error if table or populate options are missing
     * @example
     * ```typescript
     * interface Order {
     *   id: string;
     *   status: string;
     *   userId: string;
     *   productId: string;
     *   user?: {
     *     id: string;
     *     name: string;
     *     email: string;
     *   };
     *   product?: {
     *     id: string;
     *     name: string;
     *     price: number;
     *   };
     * }
     * 
     * // Find orders and populate user and product details
     * const result = await getClient.findAndPopulate<Order[]>(
     *   'orders',
     *   [{ field: 'status', value: 'pending' }],
     *   { 
     *     populate: ['user', 'product'],
     *     skip: 0,
     *     limit: 10
     *   }
     * );
     * 
     * if (result.success) {
     *   const orders = result.data as Order[];
     *   orders.forEach(order => {
     *     console.log(`Order ${order.id} by ${order.user?.name} for ${order.product?.name}`);
     *   });
     * }
     * ```
     */
    async findAndPopulate<T>(
        table: string,
        queryFilters: QueryFilter[],
        options: QueryOptions
    ): Promise<ApiResponse<T>> {
        if (!table || !options?.populate) {
            throw new Error('Table name and populate options are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/findAndPopulate`,
            queryFilters,
            options
        );
    }

    /**
     * Count documents matching filter criteria
     * @template T - Type of the response data, typically { count: number }
     * @param table - Name of the table/collection
     * @param queryFilters - Optional array of filter criteria. Each filter should have field and value properties
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether request was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Object of type T containing the count
     * @throws Error if table is missing
     * @example
     * ```typescript
     * interface CountResult {
     *   count: number;
     * }
     * 
     * // Count all active users
     * const result = await getClient.count<CountResult>(
     *   'users',
     *   [{ field: 'active', value: true }]
     * );
     * 
     * if (result.success) {
     *   console.log(`Found ${result.data.count} active users`);
     * }
     * 
     * // Count documents with multiple filters
     * const result = await getClient.count<CountResult>(
     *   'orders',
     *   [
     *     { field: 'status', value: 'pending' },
     *     { field: 'total', value: 100 }
     *   ]
     * );
     * ```
     */
    async count<T>(
        table: string,
        queryFilters?: QueryFilter[]
    ): Promise<ApiResponse<T>> {
        if (!table) {
            throw new Error('Table name is required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/count`,
            queryFilters
        );
    }

    /**
     * Perform a custom aggregation on a table
     * @template T - Type of the aggregation result
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria to filter documents before aggregation. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.skip - Number of records to skip in the aggregation results (pagination)
     * @param options.limit - Maximum number of records to return in the aggregation results (pagination)
     * @param options.populate - Array of field paths to populate with referenced documents in the aggregation results
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether aggregation was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of type T containing the aggregation results
     * @throws Error if table is missing
     * @example
     * ```typescript
     * interface AggregateResult {
     *   id: string;      // Grouped by field
     *   count: number;    // Count of documents
     *   avgAge: number;   // Average age calculation
     * }
     * 
     * // Group active users by role and calculate metrics
     * const result = await getClient.aggregate<AggregateResult[]>(
     *   'users',
     *   [{ field: 'active', value: true }],
     *   { 
     *     limit: 100,
     *     populate: ['profile'],
     *     skip: 0 
     *   }
     * );
     * 
     * if (result.success) {
     *   result.data.forEach(group => {
     *     console.log(`Role ${group.id}: ${group.count} users, avg age: ${group.avgAge}`);
     *   });
     * }
     * ```
     */
    async aggregate<T>(
        table: string,
        queryFilters?: QueryFilter[],
        options?: Pick<QueryOptions, 'skip' | 'limit' | 'populate'>
    ): Promise<ApiResponse<T>> {
        if (!table) {
            throw new Error('Table name is required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/aggregate`,
            queryFilters,
            options
        );
    }


    /**
     * Get distinct values for a specific field
     * @template T - Type of the returned distinct values array
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field and value properties
     * @param options - Additional query options
     * @param options.skip - Number of records to skip before getting distinct values
     * @param options.limit - Maximum number of distinct values to return
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether operation was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: Array of type T containing the distinct values
     * @throws Error if table or queryFilters are missing
     * @example
     * ```typescript
     * interface User {
     *   id: string;
     *   role: string;
     *   department: string;
     *   active: boolean;
     * }
     * 
     * // Get distinct department values for active users
     * const result = await getClient.distinct<string[]>(
     *   'users',
     *   [
     *     { field: 'active', value: true },
     *     { field: 'department', value: { $exists: true } }
     *   ],
     *   { limit: 20 }
     * );
     * 
     * if (result.success) {
     *   const departments = result.data;
     *   console.log('Unique departments:', departments);
     * }
     * ```
     */
    async distinct<T>(
        table: string,
        queryFilters?: QueryFilter[],
        options?: Pick<QueryOptions, 'skip' | 'limit'>
    ): Promise<ApiResponse<T>> {
        if (!table || !queryFilters?.length) {
            throw new Error('Table name and queryFilters are required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/distinct`,
            queryFilters,
            options
        );
    }
}