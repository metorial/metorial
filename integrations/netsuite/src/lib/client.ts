import type { AxiosRequestConfig } from 'axios';
import { createAxios } from 'slates';
import { buildOAuth1Header, type OAuth1Credentials } from './oauth1';

export interface NetSuiteAuth {
  token: string;
  accountId: string;
  authType: 'oauth2' | 'tba';
  consumerKey?: string;
  consumerSecret?: string;
  tokenId?: string;
  tokenSecret?: string;
}

export interface SuiteQLResponse {
  items: Record<string, any>[];
  totalResults: number;
  count: number;
  offset: number;
  hasMore: boolean;
}

export interface RecordListResponse {
  items: Record<string, any>[];
  totalResults: number;
  count: number;
  offset: number;
  hasMore: boolean;
  links: any[];
}

export class Client {
  private auth: NetSuiteAuth;
  private baseUrl: string;
  private httpClient: ReturnType<typeof createAxios>;

  constructor(auth: NetSuiteAuth) {
    this.auth = auth;
    this.baseUrl = `https://${auth.accountId}.suitetalk.api.netsuite.com/services/rest`;
    this.httpClient = createAxios({
      baseURL: this.baseUrl
    });
  }

  private getAuthHeaders(method: string, fullUrl: string): Record<string, string> {
    if (this.auth.authType === 'tba') {
      let credentials: OAuth1Credentials = {
        accountId: this.auth.accountId,
        consumerKey: this.auth.consumerKey!,
        consumerSecret: this.auth.consumerSecret!,
        tokenId: this.auth.tokenId!,
        tokenSecret: this.auth.tokenSecret!
      };
      return {
        Authorization: buildOAuth1Header(method, fullUrl, credentials)
      };
    }

    return {
      Authorization: `Bearer ${this.auth.token}`
    };
  }

  private async request<T = any>(
    method: string,
    path: string,
    options?: {
      data?: any;
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    let cleanParams: Record<string, string> = {};
    if (options?.params) {
      for (let [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          cleanParams[key] = String(value);
        }
      }
    }

    let queryString = new URLSearchParams(cleanParams).toString();
    let fullUrl = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    let authHeaders = this.getAuthHeaders(method, fullUrl);

    let config: AxiosRequestConfig = {
      method,
      url: path,
      params: cleanParams,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers
      },
      data: options?.data
    };

    let response = await this.httpClient.request(config);
    return response.data;
  }

  // --- Record CRUD Operations ---

  async getRecord(
    recordType: string,
    recordId: string,
    options?: {
      expandSubResources?: boolean;
      fields?: string[];
    }
  ): Promise<Record<string, any>> {
    let params: Record<string, string | undefined> = {};
    if (options?.expandSubResources) {
      params.expandSubResources = 'true';
    }
    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }
    return this.request('GET', `/record/v1/${recordType}/${recordId}`, { params });
  }

  async createRecord(
    recordType: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.httpClient.request({
      method: 'POST',
      url: `/record/v1/${recordType}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders('POST', `${this.baseUrl}/record/v1/${recordType}`)
      },
      // NetSuite returns 204 with Location header on create
      validateStatus: status => status >= 200 && status < 300
    });

    // If 204, extract the ID from the Location header
    if (response.status === 204) {
      let location = response.headers.location || '';
      let idMatch = location.match(/\/([^/]+)$/);
      let recordId = idMatch ? idMatch[1] : '';
      return { recordId, location };
    }

    return response.data;
  }

  async updateRecord(
    recordType: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.httpClient.request({
      method: 'PATCH',
      url: `/record/v1/${recordType}/${recordId}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders('PATCH', `${this.baseUrl}/record/v1/${recordType}/${recordId}`)
      },
      validateStatus: status => status >= 200 && status < 300
    });

    if (response.status === 204) {
      return { recordId, success: true };
    }

    return response.data;
  }

  async upsertRecord(
    recordType: string,
    externalId: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.httpClient.request({
      method: 'PUT',
      url: `/record/v1/${recordType}/${externalId}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders('PUT', `${this.baseUrl}/record/v1/${recordType}/${externalId}`)
      },
      validateStatus: status => status >= 200 && status < 300
    });

    if (response.status === 204) {
      let location = response.headers.location || '';
      let idMatch = location.match(/\/([^/]+)$/);
      let recordId = idMatch ? idMatch[1] : externalId;
      return { recordId, location };
    }

    return response.data;
  }

  async deleteRecord(recordType: string, recordId: string): Promise<void> {
    await this.request('DELETE', `/record/v1/${recordType}/${recordId}`);
  }

  // --- Record Collection / List ---

  async listRecords(
    recordType: string,
    options?: {
      limit?: number;
      offset?: number;
      query?: string;
      fields?: string[];
    }
  ): Promise<RecordListResponse> {
    let params: Record<string, string | number | undefined> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.query) params.q = options.query;
    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }
    return this.request('GET', `/record/v1/${recordType}`, { params });
  }

  // --- Record Transformation ---

  async transformRecord(
    sourceType: string,
    sourceId: string,
    targetType: string,
    body?: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.httpClient.request({
      method: 'POST',
      url: `/record/v1/${sourceType}/${sourceId}/!transform/${targetType}`,
      data: body || {},
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(
          'POST',
          `${this.baseUrl}/record/v1/${sourceType}/${sourceId}/!transform/${targetType}`
        )
      },
      validateStatus: status => status >= 200 && status < 300
    });

    if (response.status === 204) {
      let location = response.headers.location || '';
      let idMatch = location.match(/\/([^/]+)$/);
      let recordId = idMatch ? idMatch[1] : '';
      return { recordId, location, targetType };
    }

    return response.data;
  }

  // --- SuiteQL ---

  async executeSuiteQL(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<SuiteQLResponse> {
    let params: Record<string, string | number | undefined> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;

    return this.request('POST', '/query/v1/suiteql', {
      data: { q: query },
      params,
      headers: {
        Prefer: 'transient'
      }
    });
  }

  // --- Metadata ---

  async getRecordMetadata(recordType: string): Promise<Record<string, any>> {
    return this.request('GET', `/record/v1/metadata-catalog/${recordType}`);
  }
}
