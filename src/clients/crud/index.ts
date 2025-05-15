import { BaseClient } from "../BaseClient";
import { GetQueryClient } from "./get.query";
import { PatchQueryClient } from "./patch.query";
import { PostQueryClient } from "./post.query";
import { PutQueryClient } from "./put.query";
import { DeleteQueryClient } from "./delete.query";
import { AuthClient } from "../auth/auth";

/**
 * Main client class for interacting with the Hosby API.
 * Provides access to various query clients for CRUD operations.
 * 
 * @example
 * ```typescript
 * const baseClient = new BaseClient({
 *   baseURL: 'https://api.example.com',
 *   privateKey: 'your-private-key',
 *   apiKeyId: 'your-api-key-id',
 *   projectName: 'your-project-name',
 *   projectId: 'your-project-id',
 *   userId: 'your-user-id'
 * });
 * 
 * const client = new HosbyClient(baseClient);
 * 
 * // Use get client
 * const users = await client.get.find('users');
 * 
 * // Use post client
 * const newUser = await client.post.create('users', { name: 'New User' });
 * 
 * // Use put client
 * await client.put.replace('users', userId, { name: 'Updated User' });
 * 
 * // Use patch client 
 * await client.patch.updateOne('users', userId, { name: 'Modified Name' });
 * 
 * // Use delete client
 * await client.delete.removeOne('users', userId);
 * ```
 */
export class HosbyClient {
    private readonly baseClient: BaseClient;

    /**
     * Client for handling auth operations
     * @public
     */
    public readonly auth: AuthClient;


    /**
     * Client for handling read operations
     * @public
     */
    public readonly get: GetQueryClient;

    /**
     * Client for handling create operations
     * @public
     */
    public readonly post: PostQueryClient;

    /**
     * Client for handling replace operations
     * @public
     */
    public readonly put: PutQueryClient;

    /**
     * Client for handling update operations
     * @public
     */
    public readonly patch: PatchQueryClient;

    /**
     * Client for handling delete operations
     * @public
     */
    public readonly delete: DeleteQueryClient;

    /**
     * Creates a new HosbyClient instance
     * @param baseClient - Configured BaseClient instance for making HTTP requests
     * @throws {Error} When baseClient is not provided
     */
    constructor(baseClient: BaseClient) {
        if (!baseClient) {
            throw new Error('BaseClient instance is required');
        }
        this.baseClient = baseClient;
        this.get = new GetQueryClient(this.baseClient);
        this.post = new PostQueryClient(this.baseClient);
        this.put = new PutQueryClient(this.baseClient);
        this.patch = new PatchQueryClient(this.baseClient);
        this.delete = new DeleteQueryClient(this.baseClient);
        this.auth = new AuthClient(this.baseClient);
    }
}

/**
 * Factory function to create a new HosbyClient instance.
 * Provides a convenient way to instantiate the client.
 * 
 * @param baseClient - Configured BaseClient instance
 * @returns A new HosbyClient instance
 * 
 * @example
 * ```typescript
 * const baseClient = new BaseClient({
 *   baseURL: 'https://api.example.com',
 *   privateKey: 'your-private-key',
 *   apiKeyId: 'your-api-key-id',
 *   projectName: 'your-project-name',
 *   projectId: 'your-project-id',
 *   userId: 'your-user-id'
 * });
 * 
 * const client = createClient(baseClient);
 * ```
 */
export function createClient(baseClient: BaseClient): HosbyClient {
    return new HosbyClient(baseClient);
}

// Export types for consumer usage
export type { BaseClient };
export type { GetQueryClient };
export type { PostQueryClient };
export type { PutQueryClient };
export type { PatchQueryClient };
export type { DeleteQueryClient };
export type { AuthClient };

// Default export for traditional module imports
export default HosbyClient;
