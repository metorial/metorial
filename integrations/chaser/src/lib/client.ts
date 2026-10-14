import { createApiServiceError, createAxios, isApiErrorRecord } from 'slates';

// --- Mapping helpers ---

let toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

let toSnakeCaseKeys = (obj: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(obj)) {
    let snakeKey = key === 'groupId' ? 'id' : toSnakeCase(key);
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
      if (camelKey === 'groups' && Array.isArray(result[camelKey])) {
        result[camelKey] = result[camelKey].map(group => ({
          ...group,
          groupId: group.id !== undefined ? group.id : group.groupId
        }));
      }
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
  omittedCount?: number;
  omittedEntries?: Array<{ id?: string; index?: number; reason?: string }>;
}

export interface ChasingResponse {
  id: string;
  chasing: boolean;
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
      },
      paramsSerializer: { indexes: null }
    });
  }

  // --- Customers ---

  async listCustomers(params: ListParams = {}): Promise<ListResponse<any>> {
    let queryParams = this.buildListParams(params);
    let response = await this.axios.get('/v1/customers', { params: queryParams });
    return this.mapListResponse(response.data);
  }

  async getCustomer(customerId: string, additionalFields?: string[]): Promise<any> {
    let response = await this.axios.get(`/v1/customers/${encodeURIComponent(customerId)}`, {
      params: this.buildListParams({ additionalFields })
    });
    return toCamelCaseKeys(response.data.data);
  }

  async createCustomer(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/customers', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateCustomer(customerId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(
      `/v1/customers/${encodeURIComponent(customerId)}`,
      body
    );
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
    let response = await this.axios.get(
      `/v1/customers/${encodeURIComponent(customerId)}/contact_persons`,
      {
        params: queryParams
      }
    );
    return this.mapListResponse(response.data);
  }

  async getContactPerson(customerId: string, contactPersonId: string): Promise<any> {
    let response = await this.axios.get(
      `/v1/customers/${encodeURIComponent(customerId)}/contact_persons/${encodeURIComponent(contactPersonId)}`
    );
    return toCamelCaseKeys(response.data.data);
  }

  async createContactPerson(customerId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post(
      `/v1/customers/${encodeURIComponent(customerId)}/contact_persons`,
      body
    );
    return toCamelCaseKeys(response.data.data);
  }

  async updateContactPerson(
    customerId: string,
    contactPersonId: string,
    data: Record<string, any>
  ): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(
      `/v1/customers/${encodeURIComponent(customerId)}/contact_persons/${encodeURIComponent(contactPersonId)}`,
      body
    );
    return toCamelCaseKeys(response.data.data);
  }

  async deleteContactPerson(customerId: string, contactPersonId: string): Promise<void> {
    await this.axios.delete(
      `/v1/customers/${encodeURIComponent(customerId)}/contact_persons/${encodeURIComponent(contactPersonId)}`
    );
  }

  async bulkUpsertContactPersons(
    customerId: string,
    entries: Record<string, any>[]
  ): Promise<BulkResponse> {
    let body = { entries: entries.map(toSnakeCaseKeys) };
    let response = await this.axios.put(
      `/v1/bulk/customers/${encodeURIComponent(customerId)}/contact_persons`,
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
    let response = await this.axios.get(`/v1/invoices/${encodeURIComponent(invoiceId)}`);
    return toCamelCaseKeys(response.data.data);
  }

  async createInvoice(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/invoices', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(`/v1/invoices/${encodeURIComponent(invoiceId)}`, body);
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
    let response = await this.axios.get(
      `/v1/credit_notes/${encodeURIComponent(creditNoteId)}`
    );
    return toCamelCaseKeys(response.data.data);
  }

  async createCreditNote(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/credit_notes', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateCreditNote(creditNoteId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(
      `/v1/credit_notes/${encodeURIComponent(creditNoteId)}`,
      body
    );
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
    let response = await this.axios.get(
      `/v1/overpayments/${encodeURIComponent(overpaymentId)}`
    );
    return toCamelCaseKeys(response.data.data);
  }

  async createOverpayment(data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.post('/v1/overpayments', body);
    return toCamelCaseKeys(response.data.data);
  }

  async updateOverpayment(overpaymentId: string, data: Record<string, any>): Promise<any> {
    let body = toSnakeCaseKeys(data);
    let response = await this.axios.put(
      `/v1/overpayments/${encodeURIComponent(overpaymentId)}`,
      body
    );
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

  async setCustomerChasing(
    customerId: string,
    action: 'pause' | 'resume'
  ): Promise<ChasingResponse> {
    let response = await this.axios.post(
      `/v1/customers/${encodeURIComponent(customerId)}/chasing/${action}`
    );
    return this.mapChasingResponse(response.data.data);
  }

  async setInvoiceChasing(
    invoiceId: string,
    action: 'pause' | 'resume'
  ): Promise<ChasingResponse> {
    let response = await this.axios.post(
      `/v1/invoices/${encodeURIComponent(invoiceId)}/chasing/${action}`
    );
    return this.mapChasingResponse(response.data.data);
  }

  async setOrganisationChasing(action: 'pause' | 'resume'): Promise<ChasingResponse> {
    let response = await this.axios.post(`/v1/chasing/${action}`);
    return this.mapChasingResponse(response.data.data);
  }

  // --- Helpers ---

  private buildListParams(params: ListParams): Record<string, any> {
    let queryParams: Record<string, any> = {};

    if (params.page !== undefined && (!Number.isSafeInteger(params.page) || params.page < 0)) {
      throw createApiServiceError('Page must be a whole number greater than or equal to 0.');
    }
    if (
      params.limit !== undefined &&
      (!Number.isSafeInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('Limit must be a whole number between 1 and 100.');
    }

    if (params.page !== undefined) {
      queryParams.page = params.page;
    }
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }
    if (params.additionalFields && params.additionalFields.length > 0) {
      queryParams.additional_fields = params.additionalFields;
    }
    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        if (value !== undefined && value !== null) {
          let snakeKey = toSnakeCase(key);
          if (isApiErrorRecord(value)) {
            for (let [operator, operand] of Object.entries(value)) {
              if (operand !== undefined && operand !== null) {
                queryParams[`${snakeKey}[${operator}]`] = Array.isArray(operand)
                  ? operand.join(',')
                  : operand;
              }
            }
          } else {
            queryParams[snakeKey] = Array.isArray(value) ? value.join(',') : value;
          }
        }
      }
    }

    return queryParams;
  }

  private mapChasingResponse(data: unknown): ChasingResponse {
    if (
      !isApiErrorRecord(data) ||
      typeof data.id !== 'string' ||
      typeof data.chasing !== 'boolean'
    ) {
      throw createApiServiceError('Chaser returned an invalid chasing status response.');
    }
    return { id: data.id, chasing: data.chasing };
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
