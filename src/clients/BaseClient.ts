import CryptoJS from "crypto-js";
import JSEncrypt from "jsencrypt";
import { ApiResponse, BaseClientConfig, QueryFilter, QueryOptions } from "../types";
import { formatPEM } from "../utils/formatPem";

/**
 * Configuration interface for secure RSA authentication
 */
export interface SecureClientConfig extends BaseClientConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retryAttempts?: number;
  /** Whether to use secure HTTPS connections */
  secure?: boolean;
}

/**
 * Base HTTP client that handles authentication and request signing.
 * Supports multiple auth methods:
 * - CSRF tokens
 * - API keys 
 * - RSA signatures
 * 
 * @remarks
 * This is a secure client implementation that follows best practices for authentication.
 * It supports multiple auth methods and handles request signing properly.
 * 
 * @packageDocumentation
 */
export class BaseClient {
  private readonly baseURL: string;
  private csrfToken?: string;
  private readonly authConfig: {
    privateKey: string;
    publicKeyId: string;
    projectId: string;
    userId: string;
    apiKey: string;
  };

  /**
   * Creates a new BaseClient instance
   * @param config - Configuration for the client
   * @throws {Error} When required config fields are missing
   */
  constructor(config: BaseClientConfig | SecureClientConfig) {
    if (!config?.baseURL) {
      throw new Error('Base URL is required');
    }

    this.baseURL = config.baseURL;
    this.authConfig = {
      privateKey: '',
      publicKeyId: '', 
      projectId: '',
      userId: '',
      apiKey: ''
    };

    if (this.isSecureConfig(config)) {
      const { privateKey, publicKeyId, projectId, userId } = config;
      
      // Validate all required secure config fields
      const missingFields = [
        ['privateKey', privateKey],
        ['publicKeyId', publicKeyId], 
        ['projectId', projectId],
        ['userId', userId]
      ].filter(([field, value]) => !value)
       .map(([field]) => field);

      if (missingFields.length > 0) {
        throw new Error(`Missing required secure config fields: ${missingFields.join(', ')}`);
      }

      // Type-safe assignment of secure config
      this.authConfig = {
        ...this.authConfig,
        privateKey,
        publicKeyId,
        projectId, 
        userId
      };

    } else if ('apiKey' in config && typeof config.apiKey === 'string') {
      this.authConfig = {
        ...this.authConfig,
        apiKey: config.apiKey
      };
    } else {
      throw new Error('Either API key or secure config is required');
    }
  }

  /**
   * Type guard to check if config is SecureClientConfig
   * @private
   */
  private isSecureConfig(config: BaseClientConfig | SecureClientConfig): config is SecureClientConfig {
    return 'privateKey' in config && 'publicKeyId' in config;
  }

  /**
   * Signs request data using RSA private key
   * @private
   * @param data - Data to sign
   * @param privateKey - RSA private key in PEM format
   * @returns Base64 encoded signature
   * @throws {Error} If signing fails or inputs are invalid
   */
  private signWithPrivateKey(data: string, privateKey: string): string {
    if (!data || !privateKey) {
      throw new Error('Data and private key are required for signing');
    }

    try {
      const formattedKey = formatPEM(privateKey);
      const signer = new JSEncrypt();
      signer.setPrivateKey(formattedKey);

      const hashData = (input: string): string =>
        CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);

      const signature = signer.sign(data, hashData, 'sha256');
      if (!signature) {
        throw new Error('Failed to generate signature');
      }

      return signature;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during signing');
      console.error('RSA signing failed:', err);
      throw err;
    }
  }

  /**
   * Initializes the client by fetching a CSRF token
   * @throws {Error} If token fetch fails
   * @public
   */
  public async init(): Promise<void> {
    const response = await this.request<{ token: string }>('GET', 'api/secure/csrf-token');
    const data = response?.data as { token?: string };
    if (!data?.token) {
      throw new Error('Invalid CSRF token response');
    }
    this.csrfToken = data.token;
  }

  /**
   * Makes an authenticated HTTP request
   * @protected
   * @param method - HTTP method
   * @param path - Request path
   * @param queryFilters - Optional query filters
   * @param options - Optional query parameters
   * @param data - Optional request body
   * @returns Promise with typed response
   * @throws {Error} If request fails or required params missing
   */
  protected async request<T>(
    method: string,
    path: string,
    queryFilters?: QueryFilter[],
    options?: QueryOptions,
    data?: unknown,
  ): Promise<ApiResponse<T>> {
    if (!method || !path) {
      throw new Error('Method and path are required');
    }

    const url = new URL(path, this.baseURL);

    if (Array.isArray(queryFilters) && queryFilters.length > 0) {
      url.searchParams.append('filter', JSON.stringify(queryFilters));
    }

    const headers = this.buildHeaders();

    if (options) {
      const queryHeader: Record<string, unknown> = {};
      if (options.populate) queryHeader['x-populate'] = options.populate;
      if (typeof options.skip === 'number') queryHeader['x-skip'] = options.skip;
      if (typeof options.limit === 'number') queryHeader['x-limit'] = options.limit;
      if (options.query) queryHeader['x-query'] = options.query;
      if (options.slice) queryHeader['x-slice'] = options.slice;

      if (Object.keys(queryHeader).length > 0) {
        (headers as Record<string, string>)['x-query'] = JSON.stringify(queryHeader);
      }
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      ...(method !== 'GET' && data ? { body: JSON.stringify(data) } : {})
    };

    try {
      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw errorData;
      }

      return await response.json();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Request failed');
      console.error('Request error:', err);
      throw err;
    }
  }

  /**
   * Builds request headers with authentication
   * @private
   * @returns Headers object with auth credentials
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    if (this.authConfig.apiKey) {
      headers['Authorization'] = `Bearer ${this.authConfig.apiKey}`;
    }

    const { privateKey, publicKeyId, projectId, userId } = this.authConfig;
    if (privateKey && publicKeyId && projectId && userId) {
      const timestamp = Date.now().toString();
      const apiKey = `${publicKeyId}_${projectId}_${userId}`;
      const signature = this.signWithPrivateKey(`${apiKey}:${timestamp}`, privateKey);

      Object.assign(headers, {
        'x-signature': signature,
        'x-timestamp': timestamp,
        'x-api-key': apiKey
      });
    }

    return headers;
  }
}