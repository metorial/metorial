import { createHmac } from 'crypto';
import { buildApiServiceError, createAxios, requestAxiosData } from 'slates';

let API_VERSION = '2.5.0';

export interface MopinionClientConfig {
  publicKey: string;
  signatureToken: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface FeedbackFilters {
  date?: string;
  rating?: string;
  nps?: string;
  ces?: string;
  cesInverse?: string;
  gcr?: string;
  tags?: string;
}

export interface MopinionMeta {
  code: number;
  count: number;
  hasMore: boolean;
  message: string;
  total: number;
}

export interface MopinionAccount {
  name: string;
  package: string;
  endDate: string;
  numberUsers: number;
  numberCharts: number;
  numberForms: number;
  numberReports: number;
  reports: any[];
  _meta: MopinionMeta;
}

export interface MopinionReport {
  id: number;
  name: string;
  description: string;
  language: string;
  created: string;
  datasets: any[];
}

export interface MopinionDataset {
  id: number;
  name: string;
  reportId: number;
  description: string;
  dataSource: string;
}

export interface MopinionDeployment {
  key: string;
  name: string;
}

export interface MopinionField {
  key: string;
  label: string;
  shortLabel: string;
  type: string;
  datasetId: number;
  reportId: number;
  answerOptions: any;
  answerValues: string[];
}

export interface MopinionFeedbackEntry {
  id: number;
  created: string;
  datasetId: number;
  reportId: number;
  tags: string[];
  fields: { key: string; label: string; value: any }[];
}

export class MopinionClient {
  private axios: ReturnType<typeof createAxios>;
  private publicKey: string;
  private signatureToken: string;

  constructor(config: MopinionClientConfig) {
    this.publicKey = config.publicKey;
    this.signatureToken = config.signatureToken;
    this.axios = createAxios({
      baseURL: 'https://api.mopinion.com'
    });
  }

  private buildAuthToken(endpoint: string, body: string = ''): string {
    // Token format: BASE64( PUBLIC_KEY : HMAC.SHA256( RESOURCE_URI | JSON_BODY ) )
    let payload = `${endpoint}|${body}`;
    let hmacHash = createHmac('sha256', this.signatureToken).update(payload).digest('hex');
    let tokenString = `${this.publicKey}:${hmacHash}`;

    return Buffer.from(tokenString).toString('base64');
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<any> {
    let body = data === undefined ? '' : JSON.stringify(data);
    return requestAxiosData(
      `${method} ${endpoint}`,
      () =>
        this.axios.request({
          method,
          url: endpoint,
          data: data === undefined ? undefined : body,
          params,
          headers: {
            'X-Auth-Token': this.buildAuthToken(endpoint, body),
            version: method === 'GET' ? API_VERSION : '2.0.0',
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Mopinion',
          reason: 'mopinion_api_error',
          operation
        })
    );
  }

  private get(endpoint: string, params?: Record<string, unknown>): Promise<any> {
    return this.request('GET', endpoint, undefined, params);
  }

  private post(endpoint: string, data: unknown): Promise<any> {
    return this.request('POST', endpoint, data);
  }

  private put(endpoint: string, data: unknown): Promise<any> {
    return this.request('PUT', endpoint, data);
  }

  private delete(endpoint: string): Promise<any> {
    return this.request('DELETE', endpoint);
  }

  // Build query params for feedback filtering
  private buildFeedbackParams(
    pagination?: PaginationOptions,
    filters?: FeedbackFilters
  ): Record<string, any> {
    let params: Record<string, any> = {};

    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    for (let [key, value] of Object.entries(filters ?? {})) {
      if (value === undefined || value === '') continue;
      let filterKey = key === 'cesInverse' ? 'ces_inverse' : key;
      let modifier = value.match(/^(<<|>>|!|<|>)/)?.[0] ?? '';
      params[`filter[${modifier}${filterKey}]`] = value.slice(modifier.length);
    }

    return params;
  }

  // Account
  async getAccount(): Promise<any> {
    return this.get('/account');
  }

  // Reports
  async getReports(): Promise<any> {
    let account = await this.getAccount();
    return account.data?.reports ?? account.reports ?? [];
  }

  async getReport(reportId: number): Promise<any> {
    return this.get(`/reports/${reportId}`);
  }

  async addReport(data: {
    name: string;
    description?: string;
    language?: string;
  }): Promise<any> {
    return this.post('/reports', data);
  }

  async updateReport(
    reportId: number,
    data: { name?: string; description?: string; language?: string }
  ): Promise<any> {
    return this.put(`/reports/${reportId}`, data);
  }

  async deleteReport(reportId: number): Promise<any> {
    return this.delete(`/reports/${reportId}`);
  }

  // Datasets
  async getDataset(datasetId: number): Promise<any> {
    return this.get(`/datasets/${datasetId}`);
  }

  async addDataset(data: {
    name: string;
    reportId: number;
    description?: string;
    dataSource?: string;
  }): Promise<any> {
    return this.post('/datasets', data);
  }

  async updateDataset(
    datasetId: number,
    data: { name?: string; description?: string; dataSource?: string }
  ): Promise<any> {
    return this.put(`/datasets/${datasetId}`, data);
  }

  async deleteDataset(datasetId: number): Promise<any> {
    return this.delete(`/datasets/${datasetId}`);
  }

  // Deployments
  async getDeployments(): Promise<any> {
    return this.get('/deployments');
  }

  async getDeployment(deploymentKey: string): Promise<any> {
    return this.get(`/deployments/${encodeURIComponent(deploymentKey)}`);
  }

  async addDeployment(data: { key: string; name: string }): Promise<any> {
    return this.post('/deployments', data);
  }

  async deleteDeployment(deploymentKey: string): Promise<any> {
    return this.delete(`/deployments/${encodeURIComponent(deploymentKey)}`);
  }

  // Fields
  async getReportFields(reportId: number): Promise<any> {
    return this.get(`/reports/${reportId}/fields`);
  }

  async getDatasetFields(datasetId: number): Promise<any> {
    return this.get(`/datasets/${datasetId}/fields`);
  }

  // Feedback
  async getReportFeedback(
    reportId: number,
    pagination?: PaginationOptions,
    filters?: FeedbackFilters,
    feedbackId?: string
  ): Promise<any> {
    let params = this.buildFeedbackParams(pagination, filters);
    return this.get(
      `/reports/${reportId}/feedback${feedbackId ? `/${encodeURIComponent(feedbackId)}` : ''}`,
      params
    );
  }

  async getDatasetFeedback(
    datasetId: number,
    pagination?: PaginationOptions,
    filters?: FeedbackFilters,
    feedbackId?: string
  ): Promise<any> {
    let params = this.buildFeedbackParams(pagination, filters);
    return this.get(
      `/datasets/${datasetId}/feedback${feedbackId ? `/${encodeURIComponent(feedbackId)}` : ''}`,
      params
    );
  }
}
