import { BaseClient, SecureClientConfig } from './clients/BaseClient';
import { HosbyClient as CrudClient } from './clients/crud';
import { ApiResponse, BaseClientConfig, QueryFilter, QueryOptions } from './types';

/**
 * Main client class for interacting with the Hosby API.
 * Provides access to various query clients for CRUD operations.
 * 
 * @example Basic usage
 * ```typescript
 * const client = new HosbyClient({
 *   baseURL: 'https://api.example.com',
 *   apiKey: 'your-api-key',
 *   privateKey: 'your-private-key',
 *   publicKeyId: 'your-publickey-id
 *   projectId: 'your-project-id',
 *   userId?: 'your-user-id'
 * });
 * 
 * await client.init();
*/
export class HosbyClient {
  private readonly baseClient: BaseClient;
  private readonly crudClient: CrudClient;

  /**
   * Creates a new HosbyClient instance
   * @param config - Configuration options for the client
   * @throws {Error} When config is not provided
   */
  constructor(config: BaseClientConfig | SecureClientConfig) {
    if (!config) {
      throw new Error('Configuration is required');
    }
    this.baseClient = new BaseClient(config);
    this.crudClient = new CrudClient(this.baseClient);

    // Bind CRUD methods to maintain proper 'this' context
    this.find = this.crudClient.get.find.bind(this.crudClient.get);
    this.findById = this.crudClient.get.findById.bind(this.crudClient.get);
    this.findByEmail = this.crudClient.get.findByEmail.bind(this.crudClient.get);
    this.findByToken = this.crudClient.get.findByToken.bind(this.crudClient.get);
    this.distinct = this.crudClient.get.distinct.bind(this.crudClient.get);
    this.aggregate = this.crudClient.get.aggregate.bind(this.crudClient.get);
    this.count = this.crudClient.get.count.bind(this.crudClient.get);
    this.findAndPopulate = this.crudClient.get.findAndPopulate.bind(this.crudClient.get);
    this.findEqual = this.crudClient.get.findEqual.bind(this.crudClient.get);
    this.findLessThan = this.crudClient.get.findLessThan.bind(this.crudClient.get);
    this.findGreaterThan = this.crudClient.get.findGreaterThan.bind(this.crudClient.get);
    this.findByField = this.crudClient.get.findByField.bind(this.crudClient.get);

    this.insertOne = this.crudClient.post.insertOne.bind(this.crudClient.post);
    this.insertMany = this.crudClient.post.insertMany.bind(this.crudClient.post);
    this.upsert = this.crudClient.post.upsert.bind(this.crudClient.post);

    this.replaceOne = this.crudClient.put.replaceOne.bind(this.crudClient.put);
    this.findOneAndReplace = this.crudClient.put.findOneAndReplace.bind(this.crudClient.put);

    this.updateOne = this.crudClient.patch.updateOne.bind(this.crudClient.patch);
    this.updateMany = this.crudClient.patch.updateMany.bind(this.crudClient.patch);
    this.findOneAndUpdate = this.crudClient.patch.findOneAndUpdate.bind(this.crudClient.patch);

    this.deleteOne = this.crudClient.delete.deleteOne.bind(this.crudClient.delete);
    this.deleteMany = this.crudClient.delete.deleteMany.bind(this.crudClient.delete);
    this.deleteByField = this.crudClient.delete.deleteByField.bind(this.crudClient.delete);
    this.deleteByToken = this.crudClient.delete.deleteByToken.bind(this.crudClient.delete);
    this.deleteById = this.crudClient.delete.deleteById.bind(this.crudClient.delete);
    this.findOneAndDelete = this.crudClient.delete.findOneAndDelete.bind(this.crudClient.delete);
  }

  /**
   * Initializes the client by fetching a CSRF token.
   * Must be called before making any requests.
   * 
   * @throws Error if token fetch fails
   */
  public async init(): Promise<void> {
    await this.baseClient.init();
  }

  // CRUD operation methods

  /**
 * Find multiple documents based on filter criteria
 * @template T - Type of documents to return, typically an array type like User[]
 * @param project - Name of the project/workspace
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
 * @throws Error if project or table parameters are missing/empty
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
 *   'myproject',
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
  public find: typeof CrudClient.prototype.get.find;


  /**
   * Find a document by ID
   * @template T - Type of the document being returned
   * @param project - Name of the project/workspace
   * @param table - Name of the table/collection 
   * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties. 
   *                      Must include an '_id' field filter with the document ID to find.
   * @returns Promise resolving to ApiResponse containing:
   *   - success: Whether operation was successful (true/false)
   *   - status: HTTP status code (200 for success)
   *   - message: Response message describing the result
   *   - data: The found document of type T, or null if not found
   * @throws Error if project, table or queryFilters are missing/empty
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
   *   'myproject',
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
  public findById: typeof CrudClient.prototype.get.findById;


  /**
 * Find a document by email field
 * @template T - Type of the document being returned
 * @param project - Name of the project/workspace
 * @param table - Name of the table/collection
 * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties.
 *                      Must include an 'email' field filter with the email address to find.
 * @returns Promise resolving to ApiResponse containing:
 *   - success: Whether operation was successful (true/false)
 *   - status: HTTP status code (200 for success)
 *   - message: Response message describing the result
 *   - data: The found document of type T, or null if not found
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
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
  public findByEmail: typeof CrudClient.prototype.get.findByEmail;

  /**
 * Find a document by a specific token field
 * @template T - Type of the document being returned
 * @param project - Name of the project/workspace
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
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
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
  public findByToken: typeof CrudClient.prototype.get.findByToken;

  /**
   * Get distinct values for a specific field
   * @template T - Type of the returned distinct values array
   * @param project - Name of the project/workspace
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
   * @throws Error if project, table or queryFilters are missing
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
   *   'myproject',
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
  public distinct: typeof CrudClient.prototype.get.distinct;

  /**
 * Perform a custom aggregation on a table
 * @template T - Type of the aggregation result
 * @param project - Name of the project/workspace
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
 * @throws Error if project or table is missing
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
 *   'myproject',
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
  public aggregate: typeof CrudClient.prototype.get.aggregate;

  /**
 * Count documents matching filter criteria
 * @template T - Type of the response data, typically { count: number }
 * @param project - Name of the project/workspace
 * @param table - Name of the table/collection
 * @param queryFilters - Optional array of filter criteria. Each filter should have field and value properties
 * @returns Promise resolving to ApiResponse containing:
 *   - success: Whether request was successful (true/false)
 *   - status: HTTP status code (200 for success)
 *   - message: Response message describing the result
 *   - data: Object of type T containing the count
 * @throws Error if project or table is missing
 * @example
 * ```typescript
 * interface CountResult {
 *   count: number;
 * }
 * 
 * // Count all active users
 * const result = await getClient.count<CountResult>(
 *   'myproject',
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
 *   'myproject', 
 *   'orders',
 *   [
 *     { field: 'status', value: 'pending' },
 *     { field: 'total', value: 100 }
 *   ]
 * );
 * ```
 */
  public count: typeof CrudClient.prototype.get.count;


  /**
 * Find documents and populate referenced fields
 * @template T - Type of the returned documents
 * @param project - Name of the project/workspace
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
 * @throws Error if project, table or populate options are missing
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
 *   'myproject', 
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
  public findAndPopulate: typeof CrudClient.prototype.get.findAndPopulate;


  /**
 * Find documents where fields exactly match specified values
 * @template T - Type of documents to return
 * @param project - Name of the project/workspace
 * @param table - Name of the table/collection
 * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
 * @param options - Additional query options
 * @param options.limit - Maximum number of records to return
 * @returns Promise resolving to ApiResponse containing:
 *   - success: Whether query was successful (true/false)
 *   - status: HTTP status code (200 for success)
 *   - message: Response message describing the result
 *   - data: Array of found documents of type T, or empty array if none found
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
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
  public findEqual: typeof CrudClient.prototype.get.findEqual;


  /**
 * Find documents where fields are less than specified values
 * @template T - Type of documents being queried
 * @param project - Name of the project/workspace
 * @param table - Name of the table/collection
 * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
 * @param options - Additional query options
 * @param options.limit - Maximum number of records to return
 * @returns Promise resolving to ApiResponse containing:
 *   - success: Whether query was successful (true/false)
 *   - status: HTTP status code (200 for success)
 *   - message: Response message describing the result
 *   - data: Array of found documents of type T, or empty array if none found
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
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
  public findLessThan: typeof CrudClient.prototype.get.findLessThan;


  /**
 * Find documents where a field is greater than a value
 * @template T - Type of documents being queried
 * @param project - Name of the project/workspace
 * @param table - Name of the table/collection
 * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
 * @param options - Additional query options
 * @param options.limit - Maximum number of records to return
 * @returns Promise resolving to ApiResponse containing:
 *   - success: Whether query was successful (true/false)
 *   - status: HTTP status code (200 for success)
 *   - message: Response message describing the result
 *   - data: Array of found documents of type T, or empty array if none found
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
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
  public findGreaterThan: typeof CrudClient.prototype.get.findGreaterThan;

  /**
 * Find documents by a specific field value
 * @template T - Type of the documents being returned
 * @param project - Name of the project/workspace
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
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
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
  public findByField: typeof CrudClient.prototype.get.findByField;


  /**
   * Insert a single document
   * @template T - Type of the returned document
   * @template D - Type of the data to insert (defaults to unknown)
   * @param project - Name of the project/workspace
   * @param table - Name of the table/collection
   * @param data - Document to insert. Should match type D
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
   * // Insert new user and populate profile
   * const result = await postClient.insertOne<User>(
   *   'myproject',
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
   *   const newUser = result.data as User;
   *   console.log('Created user:', newUser);
   * }
   * ```
   */
  public insertOne: typeof CrudClient.prototype.post.insertOne;


  /**
   * Insert multiple documents into a table/collection
   * @template T - Type of the returned documents array
   * @template D - Type of documents being inserted (defaults to unknown)
   * @param project - Name of the project/workspace
   * @param table - Name of the table/collection
   * @param data - Array of documents to insert. Each document should match type D
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
   * // Insert multiple users and populate profiles
   * const result = await postClient.insertMany<User[]>(
   *   'myproject',
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
   *   const users = result.data as User[];
   *   console.log('Created users:', users);
   * }
   * ```
   */
  public insertMany: typeof CrudClient.prototype.post.insertMany;


  /**
   * Updates a document if it exists, otherwise creates a new one
   * @template T - Type of the returned document
   * @template D - Type of the update/insert data (defaults to unknown)
   * @param project - Name of the project/workspace
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
   * // Upsert user by email and populate profile
   * const result = await postClient.upsert<User>(
   *   'myproject',
   *   'users',
   *   [{ field: 'email', value: 'user@example.com' }],
   *   { 
   *     name: 'John Doe',
   *     email: 'user@example.com',
   *     profile: {
   *       avatar: 'avatar.jpg',
   *       bio: 'Software Developer'
   *     }
   *   },
   *   { populate: ['profile'] }
   * );
   * 
   * if (result.success) {
   *   const user = result.data as User;
   *   console.log('Upserted user:', user);
   * }
   * ```
   */
  public upsert: typeof CrudClient.prototype.post.upsert;

  /**
   * Replace a document completely with new data
   * @template T - Type of the returned document
   * @template D - Type of the replacement data (defaults to unknown)
   * @param project - Name of the project/workspace
   * @param table - Name of the table/collection 
   * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
   * @param data - New document data to replace with. Should match type D
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
   * // Replace user document by ID and populate profile
   * const result = await putClient.replaceOne<User>(
   *   'myproject',
   *   'users',
   *   [{ field: 'id', value: '507f1f77bcf86cd799439011' }],
   *   { 
   *     name: 'New Name',
   *     email: 'new@example.com',
   *     profile: {
   *       avatar: 'new.jpg',
   *       bio: 'Updated bio'
   *     }
   *   },
   *   { populate: ['profile'] }
   * );
   * ```
   */
  public replaceOne: typeof CrudClient.prototype.put.replaceOne;

  /**
   * Find a document by filter criteria and replace it with new data
   * @template T - Type of the returned document
   * @template D - Type of the replacement data (defaults to unknown)
   * @param project - Name of the project/workspace
   * @param table - Name of the table/collection
   * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
   * @param data - New document data to replace with. Should match type D
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
   *   'myproject',
   *   'users',
   *   [{ field: 'email', value: 'user@example.com' }],
   *   { 
   *     name: 'New Name',
   *     email: 'user@example.com',
   *     profile: {
   *       avatar: 'new.jpg',
   *       bio: 'Updated bio'
   *     }
   *   },
   *   { populate: ['profile'] }
   * );
   * 
   * if (result.success) {
   *   const replacedUser = result.data as User;
   *   console.log('Replaced user:', replacedUser);
   * }
   * ```
   */
  public findOneAndReplace: typeof CrudClient.prototype.put.findOneAndReplace;


  /**
 * Update a single document by filter criteria
 * @template T - Type of the returned document
 * @template D - Type of the update data (defaults to unknown)
 * @param project - Name of the project/workspace
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
 * @throws Error if project, table or queryFilters are missing/empty
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
 *   'myproject',
 *   'users', 
 *   [{ field: 'email', value: 'user@example.com' }],
 *   { status: 'active' },
 *   { populate: ['profile'] }
 * );
 * 
 * // Update document by ID
 * const result = await patchClient.updateOne<Document>(
 *   'workspace1',
 *   'documents',
 *   [{ field: '_id', value: '123abc' }],
 *   { title: 'Updated Title' }
 * );
 * ```
 */
  public updateOne: typeof CrudClient.prototype.patch.updateOne;


  /**
   * Update multiple documents matching filter criteria
   * @param project - Name of the project/workspace
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
   *   'myproject',
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
  public updateMany: typeof CrudClient.prototype.patch.updateMany;


  /**
   * Find a document by filter criteria and update it
   * @param project - Name of the project/workspace
   * @param table - Name of the table/collection 
   * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
   * @param data - Data to update the document with
   * @param options - Additional query options
   * @param options.populate - Fields to populate in the returned document. Can be a string for a single field or array of strings for multiple fields
   * @returns Promise resolving to ApiResponse containing the updated document
   * @template T - Type of the document being updated and returned
   * @template D - Type of the update data, defaults to unknown if not specified
   * @throws Error if project, table or queryFilters are missing or empty
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
   *   'myproject',
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
  public findOneAndUpdate: typeof CrudClient.prototype.patch.findOneAndUpdate;


    /**
     * Delete a single document by filter criteria
     * @template T - Type of document being deleted and returned
     * @param project - Name of the project/workspace
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful 
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: The deleted document matching type T
     * @throws Error if project, table or queryFilters are missing/empty
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
     *   'myproject',
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
     *   'workspace1', 
     *   'documents',
     *   [{ field: '_id', value: '123abc' }]
     * );
     * ```
     */
  public deleteOne: typeof CrudClient.prototype.delete.deleteOne;


    /**
     * Delete multiple documents matching filter criteria
     * @template T - Type of the response data, typically { deletedCount: number }
     * @param project - Name of the project/workspace
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Boolean indicating if operation succeeded
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: Object with deletedCount indicating number of deleted documents
     * @throws Error if project, table or queryFilters are missing/empty
     * @example
     * ```typescript
     * interface DeleteResult {
     *   deletedCount: number;
     * }
     * 
     * // Delete inactive users created before specific date
     * const result = await deleteClient.deleteMany<DeleteResult>(
     *   'myproject',
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
  public deleteMany: typeof CrudClient.prototype.delete.deleteMany;


    /**
     * Delete documents by field/value pairs
     * @template T - Type of documents being deleted and returned
     * @param project - Name of the project/workspace
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
     *   'myproject',
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
  public deleteByField: typeof CrudClient.prototype.delete.deleteByField;


    /**
     * Delete a document by token field and value
     * @template T - Type of document being deleted and returned
     * @param project - Name of the project/workspace
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: The deleted document matching type T
     * @throws Error if project, table or queryFilters are missing/empty
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
     *   'myproject', 
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
  public deleteByToken: typeof CrudClient.prototype.delete.deleteByToken;

    /**
     * Delete a document by its ID
     * @template T - Type of the document being deleted and returned
     * @param project - Name of the project/workspace
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.limit - Maximum number of documents to delete
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Human readable response message
     *   - data: The deleted document matching type T
     * @throws Error if project, table or queryFilters are missing/empty
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
     *   'myproject',
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
  public deleteById: typeof CrudClient.prototype.delete.deleteById;

    /**
     * Find a document by filter criteria and delete it
     * @template T - Type of the document being deleted and returned
     * @param project - Name of the project/workspace
     * @param table - Name of the table/collection
     * @param queryFilters - Array of filter criteria for querying. Each filter should have field, value properties
     * @param options - Additional query options
     * @param options.populate - Fields to populate in the returned document. Can be a string for a single field or array of strings for multiple fields
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether deletion was successful (true/false)
     *   - status: HTTP status code (200 for success)
     *   - message: Response message describing the result
     *   - data: The deleted document of type T
     * @throws Error if project, table or queryFilters are missing/empty
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
     *   'myproject',
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
  public findOneAndDelete: typeof CrudClient.prototype.delete.findOneAndDelete;
}

/**
 * Factory function to create a new HosbyClient instance.
 * Provides a convenient way to instantiate the client with type-safe configuration.
 * 
 * @example
 * ```typescript
 * // Basic client with API key auth
 * const client = createClient({
 *   baseURL: 'https://api.example.com',
 *   privateKey: 'your-private-key',
 *   publicKeyId: 'your-public-key-id',
 *   projectId: 'your-project-id',
 *   userId: 'your-user-id'
 * });
 * 
 * // Secure client with additional options
 * const secureClient = createClient({
 *   baseURL: 'https://api.example.com',
 *   privateKey: 'your-private-key',
 *   publicKeyId: 'your-public-key-id', 
 *   projectId: 'your-project-id',
 *   userId: 'your-user-id',
 *   timeout: 5000,
 *   retryAttempts: 3,
 *   secure: true
 * });
 * 
 * await client.init();
 * ```
 * 
 * @param config - Client configuration options. Can be either:
 *   - BaseClientConfig: Basic configuration with required baseURL, privateKey, publicKeyId, projectId and userId
 *   - SecureClientConfig: Extended configuration with additional security options like timeout and retryAttempts
 * @returns A configured HosbyClient instance ready for use
 * @throws Error if required config options are missing
 */
export function createClient(config: BaseClientConfig | SecureClientConfig): HosbyClient {
  if (!config.baseURL || !config.privateKey || !config.publicKeyId || !config.projectId || !config.userId) {
    throw new Error('baseURL, privateKey, publicKeyId, projectId and userId are required configuration options');
  }
  return new HosbyClient(config);
}

// Export public types for consumer usage
export type {
  BaseClientConfig,
  SecureClientConfig,
  QueryOptions,
  QueryFilter,
  ApiResponse
};

/**
 * Default export of the main HosbyClient class.
 * This allows importing the client directly as a default import.
 * 
 * @example
 * ```typescript
 * // Import using default export
 * import HosbyClient from '@hosby/client';
 * 
 * // Create client instance
 * const client = new HosbyClient({
 *   baseURL: 'https://api.example.com',
 *   privateKey: 'your-private-key',
 *   publicKeyId: 'your-public-key-id',
 *   projectId: 'your-project-id',
 *   userId: 'your-user-id'
 * });
 * 
 * // Or use the createClient factory function
 * import { createClient } from '@hosby/client';
 * const client = createClient({
 *   baseURL: 'https://api.example.com',
 *   privateKey: 'your-private-key',
 *   publicKeyId: 'your-public-key-id',
 *   projectId: 'your-project-id',
 *   userId: 'your-user-id'
 * });
 * ```
 */
export default HosbyClient;
