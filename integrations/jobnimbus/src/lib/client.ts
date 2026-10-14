import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://app.jobnimbus.com/api1';

export interface ListParams {
  from?: number;
  size?: number;
  filter?: Record<string, unknown>;
}

export interface ListResponse<T> {
  count: number;
  results: T[];
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'JobNimbus',
          reason: 'jobnimbus_api_error'
        })
    });
  }

  private buildQueryParams(params?: ListParams): Record<string, string> {
    let query: Record<string, string> = {};
    let from = params?.from ?? 0;
    let size = params?.size ?? 25;
    if (!Number.isInteger(from) || from < 0) {
      throw createApiServiceError('Pagination from must be a non-negative integer.');
    }
    if (!Number.isInteger(size) || size < 1 || size > 200) {
      throw createApiServiceError('Pagination size must be an integer from 1 to 200.');
    }
    query.from = String(from);
    query.size = String(size);
    if (params?.filter) query.filter = JSON.stringify(params.filter);
    return query;
  }

  // ── Contacts ──

  async listContacts(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/contacts', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
    return response.data;
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/contacts/${encodeURIComponent(contactId)}`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.put(`/contacts/${encodeURIComponent(contactId)}`, { is_active: false });
  }

  // ── Jobs ──

  async listJobs(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/jobs', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getJob(jobId: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  async createJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/jobs', data);
    return response.data;
  }

  async updateJob(jobId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/jobs/${encodeURIComponent(jobId)}`, data);
    return response.data;
  }

  // ── Tasks ──

  async listTasks(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/tasks', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/tasks/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/tasks/${encodeURIComponent(taskId)}`, data);
    return response.data;
  }

  // ── Activities ──

  async listActivities(
    params?: ListParams
  ): Promise<{ count: number; activity?: any[]; results?: any[] }> {
    let response = await this.axios.get('/activities', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getActivity(activityId: string): Promise<any> {
    let response = await this.axios.get(`/activities/${encodeURIComponent(activityId)}`);
    return response.data;
  }

  async createActivity(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/activities', data);
    return response.data;
  }

  // ── Estimates ──

  async listEstimates(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/v2/estimates', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getEstimate(estimateId: string): Promise<any> {
    let response = await this.axios.get(`/v2/estimates/${encodeURIComponent(estimateId)}`);
    return response.data;
  }

  async createEstimate(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v2/estimates', data);
    return response.data;
  }

  async updateEstimate(estimateId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/v2/estimates/${encodeURIComponent(estimateId)}`,
      data
    );
    return response.data;
  }

  // ── Invoices ──

  async listInvoices(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/v2/invoices', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let response = await this.axios.get(`/v2/invoices/${encodeURIComponent(invoiceId)}`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v2/invoices', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/v2/invoices/${encodeURIComponent(invoiceId)}`, data);
    return response.data;
  }

  // ── Files ──

  async listFiles(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/files', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getFile(fileId: string): Promise<any> {
    let response = await this.axios.get(`/files/${encodeURIComponent(fileId)}`);
    return response.data;
  }

  async createFile(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/files', data);
    return response.data;
  }

  async getAccountSettings(): Promise<any> {
    let response = await this.axios.get('/account/settings');
    return response.data;
  }

  async listUsers(): Promise<any> {
    let response = await this.axios.get('/account/users');
    return response.data;
  }
}
