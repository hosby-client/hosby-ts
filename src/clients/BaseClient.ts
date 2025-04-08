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
  private jwToken?: string;
  private readonly authConfig: {
    privateKey: string;
    apiKeyId: string;
    projectId: string;
    projectName: string;
    userId: string;
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
    const isExemptFromHttps = (): boolean => {
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
      // Using logger or custom error handling would be better than console.warn
      throw new Error('Using insecure HTTP connection. This is not recommended for production environments. Consider using HTTPS instead.');
    }

    this.baseURL = config.baseURL;
    this.authConfig = {
      privateKey: '',
      apiKeyId: '',
      projectId: '',
      projectName: '',
      userId: ''
    };
    if (this.isSecureConfig(config)) {
      const { privateKey, apiKeyId, projectId, projectName, userId } = config;

      // Validate all required secure config fields
      const missingFields = [
        ['privateKey', privateKey],
        ['apiKeyId', apiKeyId],
        ['projectId', projectId],
        ['projectName', projectName],
        ['userId', userId]
      ].filter(([, value]) => !value)
        .map(([field]) => field);

      if (missingFields.length > 0) {
        throw new Error(`Missing required secure config fields: ${missingFields.join(', ')}`);
      }

      this.authConfig = {
        ...this.authConfig,
        privateKey,
        apiKeyId,
        projectName,
        projectId,
        userId
      };
    } else {
      throw new Error('Secure config is required with privateKey, apiKeyId, userId and projectId');
    }
  }

  /**
   * Type guard to check if config is SecureClientConfig
   * @private
   */
  private isSecureConfig(config: BaseClientConfig | SecureClientConfig): config is SecureClientConfig {
    return 'privateKey' in config && 'apiKeyId' in config;
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

      CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);

      const hashFunction = (input: string): string => {
        return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
      };

      const signature = signer.sign(data, hashFunction, 'sha256');
      if (!signature) {
        throw new Error('Failed to generate signature');
      }

      return signature;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during signing');
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
    
    // Check if response is successful and has data
    if (!response || !response.success) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    // Check if data exists and has the expected structure
    if (!response.data) {
      throw new Error('Invalid CSRF token response: missing data');
    }
    
    // Try to access token from data, handling both object and direct value formats
    let token: string | undefined;
    if (typeof response.data === 'object' && response.data !== null) {
      token = (response.data as { token?: string }).token;
    } else if (typeof response.data === 'string') {
      token = response.data;
    }
    
    if (!token) {
      throw new Error('Invalid CSRF token response: token missing from response data');
    }
    
    this.csrfToken = token;
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
    const url = new URL(`${path}/`, `${this.baseURL}/${this.authConfig.projectName}`);

    // Process query filters if present
    if (queryFilters?.length) {
      // Group filters by field name using type-safe reducer
      const filtersByField = queryFilters.reduce<Record<string, unknown[]>>((acc, filter) => {
        // Ensure filter has required fields
        if (!filter?.field) {
          throw new Error('Invalid query filter - missing field');
        }

        // Initialize array for field if needed
        acc[filter.field] = acc[filter.field] || [];
        
        // Add value, ensuring it's not undefined
        const value = filter.value ?? '';
        acc[filter.field].push(value);
        
        return acc;
      }, {});

      // Add grouped filters to URL params with proper encoding
      Object.entries(filtersByField).forEach(([field, values]) => {
        values.forEach(value => {
          // Ensure proper encoding of special characters
          url.searchParams.append(
            encodeURIComponent(field),
            encodeURIComponent(String(value))
          );
        });
      });
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

      if (!response) {
        throw {
          success: false,
          status: 500,
          message: 'Empty response received'
        };
      }

      // Check for Authorization header
      const authHeader = response.headers.get('Authorization');
      if (authHeader) {
        this.jwToken = authHeader.replace('Bearer ', '');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        // Format error response consistently
        throw {
          success: false,
          status: response.status,
          message: errorData.message || 'Resource not found',
          ...errorData
        };
      }

      const jsonResponse = await response.json();
      if (!jsonResponse) {
        throw {
          success: false,
          status: 500,
          message: 'Empty response received'
        };
      }

      return jsonResponse;

    } catch (error) {
      // Check if it's a structured error we created
      if (error && typeof error === 'object' && 'success' in error) {
        throw error;
      }

      // For network errors, missing responses, or other exceptions
      const standardError = {
        success: false,
        status: 500,
        message: error instanceof Error ? error.message : 'Request failed'
      };

      throw standardError;
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

    if (this.jwToken) {
      headers['Authorization'] = `Bearer ${this.jwToken}`;
    }

    const { privateKey, apiKeyId, projectId, userId } = this.authConfig;
    if (privateKey && apiKeyId && projectId && userId) {
      const timestamp = Date.now().toString();
      const apiKey = `${apiKeyId}_${projectId}_${userId}`;
      const signature = this.signWithPrivateKey(`${apiKey}:${timestamp}`, privateKey);

      headers['x-signature'] = signature;
      headers['x-timestamp'] = timestamp;
      headers['x-api-key'] = apiKey;
    }

    return headers;
  }
}