/**
 * Generic API response type with strongly typed data
 * @template T The type of data contained in the response
 */
export type ApiResponse<T> = {
    /** Whether the request was successful */
    readonly success: boolean;
    /** HTTP status code */
    readonly status: number;
    /** Response message */
    readonly message: string;
    /** Response payload */
    readonly data: T;
};

/**
 * Generic criteria type for filtering records
 * @template T The type of record being filtered
 */
export type Criteria<T extends Record<string, unknown>> = {
    readonly [K in keyof T]?: T[K];
};

/**
 * Base client configuration options
 */
export interface BaseClientConfig {
    /** Base URL for API requests */
    readonly baseURL: string;
    /** RSA private key for request signing */
    readonly privateKey: string;
    /** Identifier for the public key pair */
    readonly apiKeyId: string;
    /** Project name */
    readonly projectName: string;
    /** Project/workspace identifier */
    readonly projectId: string;
    /** User identifier */
    readonly userId: string;
    /** Optional custom headers */
    readonly headers?: Readonly<Record<string, string>>;
    /** Additional configuration options */
    readonly [key: string]: unknown;
}

/**
 * Filter criteria for querying records
 */
export interface QueryFilter {
    /** Field name to filter on */
    readonly field: string;
    /** Value to filter by */
    readonly value: unknown;
}

/**
 * Query operators for advanced filtering
 */
export interface QueryOperators {
    /** Equal to */
    readonly $eq?: unknown;
    /** Not equal to */
    readonly $ne?: unknown;
    /** Greater than */
    readonly $gt?: unknown;
    /** Less than */
    readonly $lt?: unknown;
    /** Greater than or equal to */
    readonly $gte?: unknown;
    /** Less than or equal to */
    readonly $lte?: unknown;
    /** Value matches any in array */
    readonly $in?: readonly unknown[];
    /** Value matches none in array */
    readonly $nin?: readonly unknown[];
    /** Matches regular expression */
    readonly $regex?: string;
}

/**
 * Options for customizing query behavior
 */
export interface QueryOptions {
    /** 
     * Fields to populate in the response. Can be a single field name or array of field names.
     * Populated fields will be expanded with their full document data instead of just IDs.
     * @example
     * ```typescript
     * // Single field
     * populate: ['author']
     * 
     * // Multiple fields
     * populate: ['author', 'comments', 'categories']
     * ```
     */
    readonly populate?: readonly string[];

    /** 
     * Number of records to skip before returning results.
     * Useful for pagination when combined with limit.
     * @example
     * ```typescript
     * // Skip first 10 records
     * skip: 10
     * 
     * // Skip 20 records and limit to 10 for page 3
     * { skip: 20, limit: 10 }
     * ```
     */
    readonly skip?: number;

    /** 
     * Maximum number of records to return in the response.
     * Used for pagination and limiting result set size.
     * @example
     * ```typescript
     * // Limit to 10 records
     * limit: 10
     * 
     * // Combine with skip for pagination
     * { skip: 20, limit: 10 } // Get records 21-30
     * ```
     */
    readonly limit?: number;

    /** 
     * Query object for advanced filtering
     * @example
     * ```typescript
     * // Simple equality query
     * query: {
     *   name: { $eq: "siddick" }
     * }
     * 
     * // Multiple operators
     * query: {
     *   age: { $gt: 18, $lt: 65 },
     *   status: { $in: ["active", "pending"] }
     * }
     * ```
     */
    readonly query?: Readonly<Record<string, QueryOperators>>;

    /**
     * Slice array fields in the response to return a subset of elements
     * @example
     * ```typescript
     * // Return first 5 elements of array fields
     * slice: [0, 5]
     * 
     * // Skip first 10 and return next 20 elements
     * slice: [10, 20]
     * 
     * // Return last 3 elements using negative index
     * slice: [-3]
     * ```
     */
    readonly slice?: readonly number[];
}