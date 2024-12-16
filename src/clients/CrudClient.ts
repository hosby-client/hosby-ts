import { Criteria } from "../types";
import { BaseClient } from "./BaseClient";

export class CrudClient {

    constructor(private baseClient: BaseClient) { }

    /**
     * 
     * @param url string
     * @param queryParams Record<string, any>
     * @param options string[]
     * @returns Promise<T>
     */
    async get<T>(url: string, queryParams?: Record<string, any>, options?: { populate?: string[] }): Promise<T> {
        const params = {
            ...queryParams,
            ...(options?.populate ? { populate: options.populate.join(',') } : {}),
        };
        return this.baseClient['request']<T>('GET', url, undefined, { params });
    }


    /**
     * 
     * @param url 
     * @param id 
     * @param options 
     * @returns 
     */
    async getById<T>(url: string, id: string, options?: { populate?: string[] }): Promise<T> {
        const params = options?.populate ? { populate: options.populate.join(',') } : {};
        return this.baseClient['request']<T>('GET', `${url}/${id}`, undefined, { params });
    }


    /**
     * 
     * @param url string
     * @param data any    
     * @param options 
     * @returns Promise<T>
     */
    async post<T>(url: string, data: any, options?: { populate?: string[] }): Promise<T> {
        const params = options?.populate ? { populate: options.populate.join(',') } : {};
        return this.baseClient['request']<T>('POST', url, data, { params });
    }


    /**
     * 
     * @param url string
     * @param data any
     * @param options
     * @returns Promise<T>
     */
    async put<T>(url: string, data: any, options?: { populate?: string[] }): Promise<T> {
        const params = options?.populate ? { populate: options.populate.join(',') } : {};
        return this.baseClient['request']<T>('PUT', url, data, { params });
    }


    /**
     * 
     * @param url string
     * @param id string
     * @returns Promise<T>
     */
    async delete<T>(url: string, id: string): Promise<T> {
        return this.baseClient['request']<T>('DELETE', `${url}/${id}`);
    }


    /**
     * 
     * @param url string
     * @param criteria Criteria<T>
     * @param updateData object
     * @param options 
     * @returns 
     */
    async updateBy<T>(url: string, criteria: any, updateData: any, options?: { populate?: string[] }): Promise<T> {
        const params = options?.populate ? { populate: options.populate.join(',') } : {};
        return this.baseClient['request']<T>('PATCH', `updateBy/${url}`, { criteria, updateData }, { params });
    }


    /**
     * 
     * @param url string
     * @param id string
     * @param updateData object
     * @param options
     * @returns 
     */
    async updateOne<T>(url: string, id: string, updateData: object, options?: { populate?: string[] }): Promise<T> {
        const params = options?.populate ? { populate: options.populate.join(',') } : {};
        return this.baseClient['request']<T>('PATCH', `updateOne/${url}/${id}`, updateData, { params });
    }


    /**
     * 
     * @param url string
     * @param queryParams Record<string, any>
     * @returns Promise<T>
     */
    async getCount<T>(url: string, queryParams?: Record<string, any>): Promise<T> {
        return this.baseClient['request']<T>('GET', `count/${url}`, undefined, { params: queryParams });
    }


    /**
 * 
 * @param url string
 * @param criteria Criteria<T>
 * @returns Promise<T>
 */
    async exists<T, U = Criteria<T>>(url: string, criteria: U): Promise<T> {
        return this.baseClient['request']<T>('POST', `exists/${url}`, criteria);
    }

    /**
     * 
     * @param url string
     * @param id string
     * @returns Promise<T>
     */
    async softDelete<T>(url: string, id: string): Promise<T> {
        return this.baseClient['request']<T>('PATCH', `softDelete/${url}/${id}`);
    }

    /**
     * 
     * @param url string
     * @param id string
     * @returns Promise<T>
     */
    async restore<T>(url: string, id: string): Promise<T> {
        return this.baseClient['request']<T>('PATCH', `restore/${url}/${id}`);
    }


}