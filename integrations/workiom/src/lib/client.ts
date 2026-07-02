import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.workiom.com',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': token,
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ─── Apps ──────────────────────────────────────────────

  async getApps(): Promise<any> {
    let response = await this.http.get('/api/services/app/Apps/GetAll');
    return response.data?.result ?? response.data;
  }

  // ─── Lists ─────────────────────────────────────────────

  async getListMetadata(listId: string, expand?: string[]): Promise<any> {
    let params: Record<string, string> = { id: listId };
    if (expand && expand.length > 0) {
      expand.forEach((item, index) => {
        params[`expand[${index}]`] = item;
      });
    }
    let response = await this.http.get('/api/services/app/Lists/Get', { params });
    return response.data?.result ?? response.data;
  }

  // ─── Records ───────────────────────────────────────────

  async queryRecords(params: {
    listId: string;
    maxResultCount?: number;
    skipCount?: number;
    sorting?: string;
    filters?: { fieldId: number; operator: number; value: any }[];
  }): Promise<any> {
    let body: Record<string, any> = {
      listId: params.listId
    };
    if (params.maxResultCount !== undefined) {
      body.maxResultCount = params.maxResultCount;
    }
    if (params.skipCount !== undefined) {
      body.skipCount = params.skipCount;
    }
    if (params.sorting) {
      body.sorting = params.sorting;
    }
    if (params.filters && params.filters.length > 0) {
      body.filters = params.filters;
    }
    let response = await this.http.post('/api/services/app/Data/All', body);
    return response.data?.result ?? response.data;
  }

  async createRecord(listId: string, fields: Record<string, any>): Promise<any> {
    let response = await this.http.post('/api/services/app/Data/Create', fields, {
      params: { listId }
    });
    return response.data?.result ?? response.data;
  }

  async updateRecord(
    listId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put('/api/services/app/Data/UpdatePartial', fields, {
      params: { listId, id: recordId }
    });
    return response.data?.result ?? response.data;
  }

  async updateRecordFull(
    listId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put('/api/services/app/Data/Update', fields, {
      params: { listId, id: recordId }
    });
    return response.data?.result ?? response.data;
  }

  async deleteRecord(listId: string, recordId: string): Promise<void> {
    await this.http.delete('/api/services/app/Data/Delete', {
      params: { listId, id: recordId }
    });
  }

  // ─── Webhook Subscriptions ─────────────────────────────

  async getWebhookSubscriptions(): Promise<any[]> {
    let response = await this.http.get(
      '/api/services/app/WebhookSubscription/GetAllSubscriptions'
    );
    return response.data?.result?.items ?? response.data?.result ?? response.data;
  }

  async createWebhookSubscription(subscription: {
    appId: string;
    listId: string;
    name: string;
    webHook: string;
    eventType: number;
    isActive: boolean;
  }): Promise<any> {
    let response = await this.http.post(
      '/api/services/app/WebhookSubscription/AddSubscription',
      subscription
    );
    return response.data?.result ?? response.data;
  }

  async updateWebhookSubscription(subscription: {
    id: string;
    appId: string;
    listId: string;
    name: string;
    webHook: string;
    eventType: number;
    isActive: boolean;
  }): Promise<any> {
    let response = await this.http.put(
      '/api/services/app/WebhookSubscription/UpdateSubscription',
      subscription
    );
    return response.data?.result ?? response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.http.delete('/api/services/app/WebhookSubscription/DeleteSubscription', {
      params: { id: subscriptionId }
    });
  }
}
