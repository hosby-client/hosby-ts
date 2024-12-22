import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { TBaseClient } from "../types";

export class BaseClient {
  protected axiosInstance: AxiosInstance;
  protected csrfToken?: string;

  constructor({ baseURL, apiKey }: TBaseClient) {
    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * Initialise le client en récupérant le token CSRF depuis le backend.
   */
  async init(): Promise<void> {
    const response = await this.axiosInstance.get("/csrf-token");
    this.csrfToken = response.data.token;
  }

  protected async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const headers: Record<string, string> = {};

    // Ajouter le token CSRF si présent
    if (this.csrfToken) {
      headers["x-csrf-token"] = this.csrfToken;
    }

    headers["x-hosby-key"]  = "X_CLIENT_1000";

    try {
      const response = await this.axiosInstance.request<T>({
        method,
        url,
        data,
        headers,
        ...config,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  }
}
