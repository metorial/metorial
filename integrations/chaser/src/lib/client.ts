import { createAxios } from 'slates';

// --- Mapping helpers ---

let toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

let toSnakeCaseKeys = (obj: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(obj)) {
    let snakeKey = toSnakeCase(key);
    if (Array.isArray(value)) {
      result[snakeKey] = value.map(v =>
        typeof v === 'object' && v !== null ? toSnakeCaseKeys(v) : v
      );
    } else if (typeof value === 'object' && value !== null) {
      result[snakeKey] = toSnakeCaseKeys(value);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

let toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

let toCamelCaseKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCaseKeys(v));
  }
  if (typeof obj === 'object' && obj !== null) {
    let result: Record<string, any> = {};
    for (let [key, value] of Object.entries(obj)) {
      let camelKey = toCamelCase(key);
      result[camelKey] = toCamelCaseKeys(value);
    }
    return result;
  }
  return obj;
};

// --- Types ---

export interface ListParams {
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
  additionalFields?: string[];
}

export interface ListResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  data: T[];
}

export interface BulkResponse {
  modifiedCount: number;
  insertedCount: number;
  insertedIds: Array<{ index: number; id: string }>;
}

// --- Client ---

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://openapi.chaserhq.com',
      headers: {
        Authorization: `Basic ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Customers ---

  async listCustomers(params: ListParams = {}): Promise<ListResponse<any>> {
    let queryParams = this.buildListParams(params);
    let response = await this.axios.get('/v1/customers', { params: queryParams });
    return this.mapListResponse(response.data);
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.axios.get(`/v1/customers/${customerId}`);
    return toCamelCaseKeys(response.data.data);
  }

  async createCustomer(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/customers', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateCustomer(customerId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(`/v1/customers/${customerId}`, body);
    return toCamelCaseKeys(response.data.data);
  }

  async bulkUpsertCustomers(entries: Record<string, any>[]): Promise<BulkResponse> {
    let body = { entries: entries.map(toSnakeCaseKeys) };
    let response = await this.axios.put('/v1/bulk/customers', body);
    return toCamelCaseKeys(response.data.data);
  }

  // --- Contact Persons ---

  async listContactPersons(
    customerId: string,
    params: ListParams = {}
  ): Promise<ListResponse<any>> {
    let queryParams = this.buildListParams(params);
    let response = await this.axios.get(`/v1/customers/${customerId}/contact_persons`, {
      params: queryParams
    });
    return this.mapListResponse(response.data);
  }

  async getContactPerson(customerId: string, contactPersonId: string): Promise<any> {
    let response = await this.axios.get(
      `/v1/customers/${customerId}/contact_persons/${contactPersonId}`
    );
    return toCamelCaseKeys(response.data.data);
  }

  async createContactPerson(customerId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post(`/v1/customers/${customerId}/contact_persons`, body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateContactPerson(
    customerId: string,
    contactPersonId: string,
    data: Record<string, any>
  ): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(
      `/v1/customers/${customerId}/contact_persons/${contactPersonId}`,
      body
    );
    return toCamelCaseKeys(response.data.data);
  }

  async deleteContactPerson(customerId: string, contactPersonId: string): Promise<void> {
    await this.axios.delete(`/v1/customers/${customerId}/contact_persons/${contactPersonId}`);
  }

  async bulkUpsertContactPersons(
    customerId: string,
    entries: Record<string, any>[]
  ): Promise<BulkResponse> {
    let body = { entries: entries.map(toSnakeCaseKeys) };
    let response = await this.axios.put(
      `/v1/bulk/customers/${customerId}/contact_persons`,
      body
    );
    return toCamelCaseKeys(response.data.data);
  }

  // --- Invoices ---

  async listInvoices(params: ListParams = {}): Promise<ListResponse<any>> {
    let queryParams = this.buildListParams(params);
    let response = await this.axios.get('/v1/invoices', { params: queryParams });
    return this.mapListResponse(response.data);
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let response = await this.axios.get(`/v1/invoices/${invoiceId}`);
    return toCamelCaseKeys(response.data.data);
  }

  async createInvoice(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/invoices', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(`/v1/invoices/${invoiceId}`, body);
    return toCamelCaseKeys(response.data.data);
  }

  async bulkUpsertInvoices(entries: Record<string, any>[]): Promise<BulkResponse> {
    let body = { entries: entries.map(toSnakeCaseKeys) };
    let response = await this.axios.put('/v1/bulk/invoices', body);
    return toCamelCaseKeys(response.data.data);
  }

  // --- Credit Notes ---

  async listCreditNotes(params: ListParams = {}): Promise<ListResponse<any>> {
    let queryParams = this.buildListParams(params);
    let response = await this.axios.get('/v1/credit_notes', { params: queryParams });
    return this.mapListResponse(response.data);
  }

  async getCreditNote(creditNoteId: string): Promise<any> {
    let response = await this.axios.get(`/v1/credit_notes/${creditNoteId}`);
    return toCamelCaseKeys(response.data.data);
  }

  async createCreditNote(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/credit_notes', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateCreditNote(creditNoteId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(`/v1/credit_notes/${creditNoteId}`, body);
    return toCamelCaseKeys(response.data.data);
  }

  async bulkUpsertCreditNotes(entries: Record<string, any>[]): Promise<BulkResponse> {
    let body = { entries: entries.map(toSnakeCaseKeys) };
    let response = await this.axios.put('/v1/bulk/credit_notes', body);
    return toCamelCaseKeys(response.data.data);
  }

  // --- Overpayments ---

  async listOverpayments(params: ListParams = {}): Promise<ListResponse<any>> {
    let queryParams = this.buildListParams(params);
    let response = await this.axios.get('/v1/overpayments', { params: queryParams });
    return this.mapListResponse(response.data);
  }

  async getOverpayment(overpaymentId: string): Promise<any> {
    let response = await this.axios.get(`/v1/overpayments/${overpaymentId}`);
    return toCamelCaseKeys(response.data.data);
  }

  async createOverpayment(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/overpayments', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateOverpayment(overpaymentId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(`/v1/overpayments/${overpaymentId}`, body);
    return toCamelCaseKeys(response.data.data);
  }

  async bulkUpsertOverpayments(entries: Record<string, any>[]): Promise<BulkResponse> {
    let body = { entries: entries.map(toSnakeCaseKeys) };
    let response = await this.axios.put('/v1/bulk/overpayments', body);
    return toCamelCaseKeys(response.data.data);
  }

  // --- Organisations ---

  async getOrganisation(): Promise<any> {
    let response = await this.axios.get('/v1/organisation');
    return toCamelCaseKeys(response.data.data);
  }

  async listOrganisations(): Promise<any[]> {
    let response = await this.axios.get('/v1/organisations');
    return toCamelCaseKeys(response.data.data);
  }

  async syncOrganisation(tasks?: string[]): Promise<{ result: boolean }> {
    let body: Record<string, any> = {};
    if (tasks && tasks.length > 0) {
      body.tasks = tasks.map(task => ({ task }));
    }
    let response = await this.axios.post('/v1/organisation/sync', body);
    return response.data.data;
  }

  // --- Helpers ---

  private buildListParams(params: ListParams): Record<string, any> {
    let queryParams: Record<string, any> = {};

    if (params.page !== undefined) {
      queryParams.page = params.page;
    }
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }
    if (params.additionalFields && params.additionalFields.length > 0) {
      queryParams.additional_fields = params.additionalFields.join(',');
    }
    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        if (value !== undefined && value !== null) {
          let snakeKey = toSnakeCase(key);
          queryParams[snakeKey] = value;
        }
      }
    }

    return queryParams;
  }

  private mapListResponse(data: any): ListResponse<any> {
    return {
      pageNumber: data.page_number,
      pageSize: data.page_size,
      totalCount: data.total_count,
      data: Array.isArray(data.data) ? data.data.map(toCamelCaseKeys) : []
    };
  }
}
