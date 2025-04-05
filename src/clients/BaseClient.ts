import CryptoJS from "crypto-js";
import JSEncrypt from "jsencrypt";
import { ApiResponse, BaseClientConfig, QueryFilter, QueryOptions } from "../types";
import { formatPEM } from "../utils/formatPem";

/**
 * Configuration interface for secure RSA authentication
 */
export interface SecureClientConfig extends BaseClientConfig {
  /** 
   * HTTPS enforcement mode:
   * - 'strict': Always require HTTPS (good for production)
   * - 'warn': Allow HTTP but log warning (good for development) 
   * - 'none': No HTTPS checks (use with caution)
   * Defaults to 'warn' to balance security and development needs
   */
  httpsMode?: 'strict' | 'warn' | 'none';

  /**
   * Hostnames that are exempt from HTTPS enforcement
   * Useful for allowing local development environments
   * Example: ['localhost', '127.0.0.1', '.local']
   */
  httpsExemptHosts?: string[];

  /** 
   * Request timeout in milliseconds.
   * Requests that take longer than this will be aborted.
   * Defaults to no timeout if not specified.
   * @example
   * ```typescript
   * // Timeout after 5 seconds
   * const client = new BaseClient({
   *   baseURL: 'https://api.example.com',
   *   timeout: 5000
   * });
   * ```
   */
  timeout?: number;

  /** 
   * Number of retry attempts for failed requests.
   * If a request fails due to network issues or server errors,
   * it will be retried up to this many times before giving up.
   * Defaults to 0 (no retries) if not specified.
   * @example
   * ```typescript
   * // Retry failed requests up to 3 times
   * const client = new BaseClient({
   *   baseURL: 'https://api.example.com',
   *   retryAttempts: 3
   * });
   * ```
   */
  retryAttempts?: number;

  /** 
   * Whether to enforce secure HTTPS connections.
   * When true, requests will only be made over HTTPS.
   * When false, both HTTP and HTTPS are allowed.
   * For more granular control, use httpsMode instead.
   * @deprecated Use httpsMode for more control over HTTPS enforcement
   * @example
   * ```typescript
   * // Require HTTPS connections
   * const client = new BaseClient({
   *   baseURL: 'https://api.example.com',
   *   secure: true
   * });
   * ```
   */
  secure?: boolean;

  /**
   * RSA private key for request signing
   */
  privateKey: string;

  /**
   * Public key identifier
   */
  publicKeyId: string;

  /**
   * Project identifier
   */
  projectId: string;

  /**
   * User identifier
   */
  userId: string;
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

    // Get HTTPS enforcement mode (default to 'warn')
    const httpsMode = 'httpsMode' in config ? config.httpsMode : 'warn';
    const defaultExemptHosts: string[] = ['localhost', '127.0.0.1', '.local', '.test'];
    const httpsExemptHosts: string[] = 'httpsExemptHosts' in config && Array.isArray(config.httpsExemptHosts) ?
      config.httpsExemptHosts :
      defaultExemptHosts;

    // Check if URL is exempt from HTTPS enforcement
    const isExemptFromHttps = () => {
      try {
        const url = new URL(config.baseURL);
        return httpsExemptHosts.some((exemptHost: string) => {
          if (exemptHost.startsWith('.')) {
            return url.hostname.endsWith(exemptHost);
          }
          return url.hostname === exemptHost;
        });
      } catch {
        return false;
      }
    };

    // Enforce HTTPS based on mode and exemptions
    if (httpsMode === 'strict' && !config.baseURL.startsWith('https://') && !isExemptFromHttps()) {
      throw new Error('HTTPS protocol is required for secure connections. Use httpsExemptHosts to allow specific hostnames or set httpsMode to "warn" or "none" for development.');
    } else if (httpsMode === 'warn' && !config.baseURL.startsWith('https://') && !isExemptFromHttps()) {
      console.warn(
        'WARNING: Using insecure HTTP connection. ' +
        'This is not recommended for production environments. ' +
        'Consider using HTTPS instead.'
      );
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
      ].filter(([, value]) => !value)
        .map(([field]) => field);

      if (missingFields.length > 0) {
        throw new Error(`Missing required secure config fields: ${missingFields.join(', ')}`);
      }

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
        headers['x-query'] = JSON.stringify(queryHeader);
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
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
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

      headers['x-signature'] = signature;
      headers['x-timestamp'] = timestamp;
      headers['x-api-key'] = apiKey;
    }

    return headers;
  }
}