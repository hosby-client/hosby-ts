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
   * Name of the CSRF cookie.
   * This should match the name used by your server.
   * Defaults to 'hosbyapiservices-X-CSRF-Token' if not specified.
   */
  csrfCookieName?: string;

  /**
* Whether to use same CSRF token strategy
* When true, the library will try to maintain the same token
* rather than updating from response headers
* Defaults to false
*/
  useSameToken?: boolean;
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
  protected csrfToken?: string;
  private readonly csrfCookieName: string = "hosbyapiservices-X-CSRF-Token";
  private readonly useSameToken?: boolean;
  private jwToken?: string;
  private readonly authConfig: {
    privateKey: string;
    apiKeyId: string;
    projectId: string;
    projectName: string;
    userId: string;
  };
  private readonly isNode: boolean;

  /**
   * Creates a new BaseClient instance
   * @param config - Configuration for the client
   * @throws {Error} When required config fields are missing
   */
  constructor(config: BaseClientConfig | SecureClientConfig) {
    if (!config?.baseURL) {
      throw new Error('Base URL is required');
    }

    // Detect environment
    this.isNode = typeof window === 'undefined' || typeof document === 'undefined';
    this.useSameToken = (config as SecureClientConfig).useSameToken ?? true;

    const httpsMode = (config as SecureClientConfig).httpsMode ?? 'warn';
    const defaultExemptHosts: string[] = ['localhost', '127.0.0.1', '.local', '.test'];
    const httpsExemptHosts: string[] = (config as SecureClientConfig).httpsExemptHosts ?? defaultExemptHosts;

    if (httpsMode === 'strict' && !config.baseURL.startsWith('https://') && !this.isExemptFromHttps(config.baseURL, httpsExemptHosts)) {
      throw new Error('HTTPS protocol is required for secure connections. Use httpsExemptHosts to allow specific hostnames or set httpsMode to "warn" or "none" for development.');
    } else if (httpsMode === 'warn' && !config.baseURL.startsWith('https://') && !this.isExemptFromHttps(config.baseURL, httpsExemptHosts)) {
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
        privateKey,
        apiKeyId,
        projectId,
        projectName,
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
 * Sets a cookie with the specified name and value
 * @param name Cookie name
 * @param value Cookie value
 * @param days Optional expiration in days (defaults to 7)
 * @private
 */
  private setCookie(name: string, value: string, days = 7): void {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      // Check if we're in a browser environment before trying to set a cookie
      if (typeof document !== 'undefined') {
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
      } else {
        // In Node.js or other non-browser environments, cookies can't be set directly
        // Store in memory or log for debugging

        throw new Error(`Cookie ${name} would be set to ${value} (not in browser environment)`);
      }
    } catch (error) {
      throw new Error(`Failed to set cookie ${name}:` + error);
    }
  }

  /**
   * Gets a cookie by name
   * @param name Cookie name
   * @returns Cookie value or undefined if not found
   * @private
   */
  private getCookie(name: string): string | undefined {
    try {
      const nameEQ = name + "=";
      // Check if we're in a browser environment before accessing document
      const ca = typeof document !== 'undefined' ? document.cookie.split(';') : [];
      for (let i = 0; i < ca.length; i++) {
        const cookie = ca[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
          return cookie.substring(nameEQ.length);
        }
      }
      return undefined;
    } catch (error) {
      throw new Error(`Failed to get cookie ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks if a given URL is exempt from HTTPS requirement
   * @param baseURL The URL to check
   * @param httpsExemptHosts Array of hostnames that are exempt from HTTPS requirement
   * @returns true if the URL's hostname matches any exempt host, false otherwise
   * @private
   */
  private isExemptFromHttps(baseURL: string, httpsExemptHosts: string[]): boolean {
    try {
      const url = new URL(baseURL);
      return httpsExemptHosts.some((exemptHost: string) => {
        if (exemptHost.startsWith('.')) {
          return url.hostname.endsWith(exemptHost);
        }
        return url.hostname === exemptHost;
      });
    } catch {
      return false;
    }
  }

  /**
   * Signs data using RSA private key
   * @param data The string data to be signed
   * @param privateKey The RSA private key in PEM format or with sk_ prefix
   * @returns Base64-encoded signature string
   * @throws Error if data or private key is missing, or if signing fails
   * @private
   */
  private signWithPrivateKey(data: string, privateKey: string): string {
    if (!data || !privateKey) {
      throw new Error('Data and private key are required for signing');
    }
    try {
      const privateKeyPem = formatPEM(privateKey);

      if (!privateKeyPem.includes('-----BEGIN PRIVATE KEY-----') || !privateKeyPem.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Invalid private key format: missing BEGIN/END markers');
      }

      const signer = new JSEncrypt();
      signer.setPrivateKey(privateKeyPem);

      const hashFunction = (input: string): string => {
        return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
      };

      const signature = signer.sign(data, hashFunction, 'sha256');

      if (!signature) {
        throw new Error('Failed to generate signature - JSEncrypt returned null');
      }

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `Signature error: ${error.message}`
        : 'Unknown error during signing';

      throw new Error(errorMessage);
    }
  }

  /**
 * Updates CSRF token and synchronizes between header and cookie
 * @param token The new CSRF token value
 * @private
 */
  private updateCSRFToken(token: string): void {
    if (!token) return;

    // Update in-memory token
    this.csrfToken = token;

    // Update cookie in browser environment
    if (!this.isNode) {
      this.setCookie(this.csrfCookieName as string, token);
    } else {
      console.warn(`CSRF token updated (Node.js): ${token}`);
    }
  }

  /**
* Synchronizes CSRF token between memory and cookie in browser environment
* @private
*/
  private syncCSRFToken(): void {
    if (this.isNode) return;

    const cookieToken = this.getCookie(this.csrfCookieName);
    const cookieName = this.csrfCookieName as string;

    if (!this.csrfToken && cookieToken) {
      // Cookie exists but memory token doesn't - use cookie value
      this.csrfToken = cookieToken;
    } else if (this.csrfToken) {
      // Memory token exists - ensure cookie matches
      if (!cookieToken || this.csrfToken !== cookieToken) {
        this.setCookie(cookieName, this.csrfToken);
        const action = !cookieToken ? 'Set' : 'Synchronized mismatched';
        console.warn(`CSRF token ${action} (Node.js): ${this.csrfToken}`);
      }
    }
  }

  /**
   * Initializes the client by fetching a CSRF token
   * @throws {Error} If token fetch fails
   * @public
   */
  public async init(): Promise<void> {
    if (this.isNode && this.csrfToken) {
      return;
    }

    // In browser environment, check if we already have a token in cookie
    if (!this.isNode) {
      // In browser environment, check if we already have a token in cookie
      const cookieToken = this.getCookie(this.csrfCookieName as string);

      // If there's a cookie token, set it to the csrfToken
      if (cookieToken) {
        this.csrfToken = cookieToken;
      } else {
        // If no token is found, we can log or handle the absence of a token
        console.warn('No CSRF token found in cookies.');
      }
    }

    const response = await this.request<{ token: string }>('GET', 'api/secure/csrf-token');

    if (!response || !response.success) {
      throw new Error('Failed to fetch CSRF token');
    }

    if (!response.data) {
      throw new Error('Invalid CSRF token response: missing data');
    }

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
    if (this.csrfCookieName) {
      this.setCookie(this.csrfCookieName, token);
    } else {
      throw new Error('No CSRF cookie name configured. Token will only be stored.');
    }
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

    // Sync CSRF token before each request in browser environments
    if (!this.isNode) {
      this.syncCSRFToken();
    }

    const url = new URL(
      path === "api/secure/csrf-token"
        ? `${this.baseURL}/${path}`
        : `${this.baseURL}/${this.authConfig.projectName}/${path}`
    );

    if (queryFilters?.length) {
      const filtersByField = queryFilters.reduce<Record<string, unknown[]>>((acc, filter) => {
        if (!filter?.field) {
          throw new Error('Invalid query filter - missing field');
        }
        acc[filter.field] = acc[filter.field] || [];
        const value = filter.value ?? '';
        acc[filter.field].push(value);
        return acc;
      }, {});

      Object.entries(filtersByField).forEach(([field, values]) => {
        values.forEach(value => {
          url.searchParams.append(
            encodeURIComponent(field),
            encodeURIComponent(String(value))
          );
        });
      });
    }

    const headers = this.buildHeaders(options);

    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: 'include',
      mode: 'cors',
      ...(method !== 'GET' && data ? { body: JSON.stringify(data) } : {})
    };

    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }

    try {
      const response = await fetch(url.toString(), requestOptions);

      if (!response) {
        throw {
          success: false,
          status: 500,
          message: 'Empty response received'
        };
      }

      const authHeader = response.headers.get('Authorization');
      if (authHeader) {
        this.jwToken = authHeader.replace('Bearer ', '');
      }

      if (!this.useSameToken) {
        const newCsrfToken = response.headers.get('x-csrf-token-hosby') || response.headers.get('X-CSRF-Token-Hosby');
        if (newCsrfToken && newCsrfToken !== this.csrfToken) {
          this.updateCSRFToken(newCsrfToken);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
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
      if (error && typeof error === 'object' && 'success' in error) {
        throw error;
      }

      const standardError = {
        success: false,
        status: 500,
        message: error instanceof Error ? error.message : 'Request failed'
      };

      throw standardError;
    }
  }

  /**
   * Builds HTTP headers for API requests
   * 
   * Includes authentication headers (CSRF token, JWT token),
   * API key authentication with RSA signature when secure config is provided,
   * and query option headers for pagination, filtering, etc.
   * 
   * @param options Optional query parameters for filtering, pagination, and data selection
   * @returns Object containing all required HTTP headers
   * @private
   */
  private buildHeaders(options?: QueryOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.csrfToken) {
      headers['X-CSRF-Token-Hosby'] = this.csrfToken;

      // Synchronize cookie with in-memory token in browser environments
      if (!this.isNode && this.csrfCookieName) {
        const cookieToken = this.getCookie(this.csrfCookieName);
        if (cookieToken !== this.csrfToken) {
          this.setCookie(this.csrfCookieName, this.csrfToken);
        }
      }
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


    if (options) {
      if (options.populate) headers['x-populate'] = options.populate.join(',');
      if (typeof options.skip === 'number') headers['x-skip'] = options.skip.toString();
      if (typeof options.limit === 'number') headers['x-limit'] = options.limit.toString();
      if (options.query) headers['x-query'] = JSON.stringify(options.query);
      if (options.slice) headers['x-slice'] = options.slice.join(',');
    }

    return headers;
  }
}