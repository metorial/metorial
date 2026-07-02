import { createHmac } from 'crypto';
import { createAxios } from 'slates';

let API_VERSION = '2.0.0';

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

  private async get(endpoint: string, params?: Record<string, any>): Promise<any> {
    let authToken = this.buildAuthToken(endpoint);
    let response = await this.axios.get(endpoint, {
      headers: {
        'X-Auth-Token': authToken,
        version: API_VERSION
      },
      params
    });
    return response.data;
  }

  private async post(endpoint: string, data: any): Promise<any> {
    let body = JSON.stringify(data);
    let authToken = this.buildAuthToken(endpoint, body);
    let response = await this.axios.post(endpoint, data, {
      headers: {
        'X-Auth-Token': authToken,
        version: API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  private async put(endpoint: string, data: any): Promise<any> {
    let body = JSON.stringify(data);
    let authToken = this.buildAuthToken(endpoint, body);
    let response = await this.axios.put(endpoint, data, {
      headers: {
        'X-Auth-Token': authToken,
        version: API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  private async delete(endpoint: string): Promise<any> {
    let authToken = this.buildAuthToken(endpoint);
    let response = await this.axios.delete(endpoint, {
      headers: {
        'X-Auth-Token': authToken,
        version: API_VERSION
      }
    });
    return response.data;
  }

  // Build query params for feedback filtering
  private buildFeedbackParams(
    pagination?: PaginationOptions,
    filters?: FeedbackFilters
  ): Record<string, any> {
    let params: Record<string, any> = {};

    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    if (filters?.date) params['filter[date]'] = filters.date;
    if (filters?.rating) params['filter[rating]'] = filters.rating;
    if (filters?.nps) params['filter[nps]'] = filters.nps;
    if (filters?.ces) params['filter[ces]'] = filters.ces;
    if (filters?.cesInverse) params['filter[ces_inverse]'] = filters.cesInverse;
    if (filters?.gcr) params['filter[gcr]'] = filters.gcr;
    if (filters?.tags) params['filter[tags]'] = filters.tags;

    return params;
  }

  // Account
  async getAccount(): Promise<any> {
    return this.get('/account');
  }

  // Reports
  async getReports(): Promise<any> {
    return this.get('/reports');
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
    return this.get(`/deployments/${deploymentKey}`);
  }

  async addDeployment(data: { key: string; name: string }): Promise<any> {
    return this.post('/deployments', data);
  }

  async deleteDeployment(deploymentKey: string): Promise<any> {
    return this.delete(`/deployments/${deploymentKey}`);
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
    filters?: FeedbackFilters
  ): Promise<any> {
    let params = this.buildFeedbackParams(pagination, filters);
    return this.get(`/reports/${reportId}/feedback`, params);
  }

  async getDatasetFeedback(
    datasetId: number,
    pagination?: PaginationOptions,
    filters?: FeedbackFilters
  ): Promise<any> {
    let params = this.buildFeedbackParams(pagination, filters);
    return this.get(`/datasets/${datasetId}/feedback`, params);
  }
}
