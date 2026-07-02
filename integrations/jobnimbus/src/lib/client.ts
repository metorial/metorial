import { createAxios } from 'slates';

let BASE_URL = 'https://app.jobnimbus.com/api1';

export interface ListParams {
  from?: number;
  size?: number;
  filter?: Record<string, any>;
}

export interface ListResponse<T> {
  count: number;
  results: T[];
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private buildQueryParams(params?: ListParams): Record<string, string> {
    let query: Record<string, string> = {};
    if (params?.from !== undefined) query.from = String(params.from);
    if (params?.size !== undefined) query.size = String(params.size);
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
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  // ── Jobs ──

  async listJobs(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/jobs', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getJob(jobId: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${jobId}`);
    return response.data;
  }

  async createJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/jobs', data);
    return response.data;
  }

  async updateJob(jobId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/jobs/${jobId}`, data);
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
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/tasks/${taskId}`, data);
    return response.data;
  }

  // ── Activities ──

  async listActivities(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/activities', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getActivity(activityId: string): Promise<any> {
    let response = await this.axios.get(`/activities/${activityId}`);
    return response.data;
  }

  async createActivity(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/activities', data);
    return response.data;
  }

  // ── Estimates ──

  async listEstimates(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/estimates', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getEstimate(estimateId: string): Promise<any> {
    let response = await this.axios.get(`/estimates/${estimateId}`);
    return response.data;
  }

  async createEstimate(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/estimates', data);
    return response.data;
  }

  async updateEstimate(estimateId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/estimates/${estimateId}`, data);
    return response.data;
  }

  // ── Invoices ──

  async listInvoices(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/invoices', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/invoices', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/invoices/${invoiceId}`, data);
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
    let response = await this.axios.get(`/files/${fileId}`);
    return response.data;
  }

  async createFile(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/files', data);
    return response.data;
  }
}
