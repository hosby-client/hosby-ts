import { Criteria } from "../types";
import { BaseClient } from "./BaseClient";


export class BulkClient {

    constructor(private baseClient: BaseClient) { }

    /**
     * 
     * @param url string
     * @param data any
     * @returns Promise<T>
     */
    async bulkInsert<T>(url: string, data: any[]): Promise<T> {
        return this.baseClient['request']<T>('POST', `bulkInsert/${url}`, data);
    }

    /**
     * 
     * @param url string
     * @param criteria any
     * @returns 
     */
    async bulkDelete<T, U = Criteria<T>>(url: string, criteria: U): Promise<T> {
        return this.baseClient['request']<T>('DELETE', `bulkDelete/${url}`, criteria);
    }

    /**
     * 
     * @param url string
     * @param criteria Criteria<T>
     * @param updateData Array<{}>
     * @returns 
     */
    async bulkUpdate<T, U = Criteria<T>>(url: string, criteria: U, updateData: Array<{}>): Promise<T> {
        return this.baseClient['request']<T>('PATCH', `bulkUpdate/${url}`, { criteria, updateData });
    }
}
