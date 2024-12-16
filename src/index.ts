import { BaseClient } from './clients/BaseClient';
import { CrudClient } from './clients/CrudClient';
import { BulkClient } from './clients/BulkClient';

export class HosbyClient {
  public crud: CrudClient;
  public bulk: BulkClient;
  private baseClient: BaseClient;

  constructor(baseURL: string, apiKey: string) {
    this.baseClient = new BaseClient(baseURL, apiKey);
    this.crud = new CrudClient(this.baseClient);
    this.bulk = new BulkClient(this.baseClient);
  }

  /**
   * Initialise le client principal en récupérant le token CSRF.
   */
  async init(): Promise<void> {
    // Initialiser le token CSRF pour tous les sous-clients
    await this.baseClient.init(); 
  }
}
