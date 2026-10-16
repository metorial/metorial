import { buildApiServiceError, createAxios, isApiErrorRecord, requestAxiosData } from 'slates';

export let workiomError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Workiom',
    reason: 'workiom_api_error',
    operation,
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: ['message', 'details', 'code'],
    nestedKeys: ['error', 'validationErrors', 'errors'],
    extractUpstreamCode: (_error, response) => {
      let body = response?.data;
      let code =
        isApiErrorRecord(body) && isApiErrorRecord(body.error) ? body.error.code : undefined;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let readWorkiomResponse = (data: any, operation: string) => {
  if (data?.success === false || data?.unAuthorizedRequest === true) {
    throw workiomError({ response: { data } }, operation);
  }
  return data?.result ?? data;
};

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

  private async request(
    operation: string,
    request: Parameters<typeof requestAxiosData>[1]
  ): Promise<any> {
    let data = await requestAxiosData(operation, request, workiomError);
    return readWorkiomResponse(data, operation);
  }

  async getApps(): Promise<any> {
    return this.request('list apps', () => this.http.get('/api/services/app/Apps/GetAll'));
  }

  async getListMetadata(listId: string, expand?: string[]): Promise<any> {
    let params: Record<string, string> = { id: listId };
    if (expand && expand.length > 0) {
      expand.forEach((item, index) => {
        params[`expand[${index}]`] = item;
      });
    }
    return this.request('get list metadata', () =>
      this.http.get('/api/services/app/Lists/Get', { params })
    );
  }

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
    return this.request('query records', () =>
      this.http.post('/api/services/app/Data/All', body)
    );
  }

  async createRecord(listId: string, fields: Record<string, any>): Promise<any> {
    return this.request('create record', () =>
      this.http.post('/api/services/app/Data/Create', fields, { params: { listId } })
    );
  }

  async updateRecord(
    listId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<any> {
    return this.request('partially update record', () =>
      this.http.put('/api/services/app/Data/UpdatePartial', fields, {
        params: { listId, id: recordId }
      })
    );
  }

  async updateRecordFull(
    listId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<any> {
    return this.request('update full record', () =>
      this.http.put('/api/services/app/Data/Update', fields, {
        params: { listId, id: recordId }
      })
    );
  }

  async deleteRecord(listId: string, recordId: string): Promise<void> {
    await this.request('delete record', () =>
      this.http.delete('/api/services/app/Data/Delete', {
        params: { listId, id: recordId }
      })
    );
  }

  async getWebhookSubscriptions(): Promise<any> {
    return this.request('list webhook subscriptions', () =>
      this.http.get('/api/services/app/WebhookSubscription/GetAllSubscriptions')
    );
  }

  async getWebhookSubscription(subscriptionId: string): Promise<any> {
    return this.request('get webhook subscription', () =>
      this.http.get('/api/services/app/WebhookSubscription/GetSubscription', {
        params: { subscriptionId }
      })
    );
  }

  async createWebhookSubscription(subscription: {
    appId: string;
    listId: string;
    name: string;
    webHook: string;
    eventType: number;
    isActive: boolean;
  }): Promise<any> {
    return this.request('create webhook subscription', () =>
      this.http.post('/api/services/app/WebhookSubscription/AddSubscription', subscription)
    );
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
    return this.request('update webhook subscription', () =>
      this.http.put('/api/services/app/WebhookSubscription/UpdateSubscription', subscription)
    );
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.request('delete webhook subscription', () =>
      this.http.delete('/api/services/app/WebhookSubscription/DeleteSubscription', {
        params: { subscriptionId }
      })
    );
  }
}
