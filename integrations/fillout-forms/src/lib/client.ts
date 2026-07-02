import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl?: string;
}

export interface ListSubmissionsParams {
  limit?: number;
  offset?: number;
  afterDate?: string;
  beforeDate?: string;
  status?: 'finished' | 'in_progress';
  sort?: 'asc' | 'desc';
  search?: string;
  includeEditLink?: boolean;
  includePreview?: boolean;
}

export interface CreateSubmissionInput {
  questions: Array<{ id: string; value: any }>;
  urlParameters?: Array<{ id: string; value: any }>;
  submissionTime?: string;
  lastUpdatedAt?: string;
  scheduling?: Array<{ id: string; value: any }>;
  payments?: Array<{ id: string; value: any }>;
  login?: { email: string };
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseUrl = config.baseUrl || 'https://api.fillout.com';
    this.axios = createAxios({
      baseURL: `${baseUrl}/v1/api`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listForms(): Promise<Array<{ formId: string; name: string }>> {
    let response = await this.axios.get('/forms');
    return response.data;
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.axios.get(`/forms/${formId}`);
    return response.data;
  }

  async listSubmissions(formId: string, params?: ListSubmissionsParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.afterDate) queryParams.afterDate = params.afterDate;
    if (params?.beforeDate) queryParams.beforeDate = params.beforeDate;
    if (params?.status) queryParams.status = params.status;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.search) queryParams.search = params.search;
    if (params?.includeEditLink !== undefined)
      queryParams.includeEditLink = String(params.includeEditLink);
    if (params?.includePreview !== undefined)
      queryParams.includePreview = String(params.includePreview);

    let response = await this.axios.get(`/forms/${formId}/submissions`, {
      params: queryParams
    });
    return response.data;
  }

  async getSubmission(
    formId: string,
    submissionId: string,
    includeEditLink?: boolean
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (includeEditLink !== undefined) params.includeEditLink = String(includeEditLink);

    let response = await this.axios.get(`/forms/${formId}/submissions/${submissionId}`, {
      params
    });
    return response.data;
  }

  async createSubmissions(formId: string, submissions: CreateSubmissionInput[]): Promise<any> {
    let response = await this.axios.post(`/forms/${formId}/submissions`, {
      submissions
    });
    return response.data;
  }

  async deleteSubmission(formId: string, submissionId: string): Promise<any> {
    let response = await this.axios.delete(`/forms/${formId}/submissions/${submissionId}`);
    return response.data;
  }

  async createWebhook(formId: string, url: string): Promise<{ id: number }> {
    let response = await this.axios.post('/webhook/create', { formId, url });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.post('/webhook/delete', { webhookId });
    return response.data;
  }
}
