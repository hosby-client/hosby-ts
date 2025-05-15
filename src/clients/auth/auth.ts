import { ApiResponse } from "../../types";
import { BaseClient } from "../BaseClient";

export class AuthClient {
    constructor(private readonly baseClient: BaseClient) { }

    /**
     * Authenticates a user by logging them into the specified table/collection.
     * This method sends a POST request to the login endpoint with the provided credentials.
     * 
     * @template T - Type of the expected response data
     * @template D - Type of the data to be sent in the login request (defaults to unknown)
     * @param authenticatorId - Unique identifier for the authentication method being used
     * @param table - Name of the table/collection to log in to
     * @param data - The credentials or data to be sent for login, which should match type D
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Indicates whether the login was successful (true/false)
     *   - status: HTTP status code (typically 200 for success)
     *   - message: Response message providing details about the login attempt
     *   - data: Additional data returned from the login operation, if any
     * @throws Error if the table name is missing, not a string, or if data is not provided
     */
    async login<T, D = unknown>(
        authenticatorId: string,
        table: string,
        data: D,
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !authenticatorId || typeof authenticatorId !== 'string' || !data) {
            throw new Error('Table and data are required');
        }

        return this.baseClient['request']<T>(
            'POST',
            `${table}/${authenticatorId}/login`,
            undefined,
            undefined,
            data
        );
    }


    
    /**
     * Logs out the user from the specified table/collection.
     * This method sends a GET request to the logout endpoint to terminate the user's session.
     * 
     * @template T - Type of the expected response data
     * @param authenticatorId - Unique identifier for the authentication method being used
     * @param table - Name of the table/collection from which to log out the user
     * @returns Promise resolving to ApiResponse containing:
     *   - success: Whether the logout was successful (true/false)
     *   - status: HTTP status code (typically 200 for success)
     *   - message: Response message describing the result
     *   - data: Additional data returned from the logout operation, if any
     * @throws Error if the table name is missing or not a string
     */
    async logout<T>(
        authenticatorId: string,
        table: string
    ): Promise<ApiResponse<T>> {
        if (!table || typeof table !== 'string' || !authenticatorId || typeof authenticatorId !== 'string') {
            throw new Error('Table is required');
        }

        return this.baseClient['request']<T>(
            'GET',
            `${table}/${authenticatorId}/logout`,
            undefined,
            undefined,
            undefined
        );
    }
}