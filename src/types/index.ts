export type Criteria<T> = Partial<Record<keyof T, any>>;

export type TBaseClient = {
    baseURL: string;
    apiKey: string;
    headers?: Record<string, string>;
    [key: string]: any;
}