import { createAxios } from 'slates';

export type BigMLRegion = 'us' | 'au';

export type BigMLConfig = {
  username: string;
  token: string;
  region: BigMLRegion;
  devMode: boolean;
  organizationId?: string;
  projectId?: string;
};

export type BigMLResourceStatus = {
  code: number;
  message: string;
  elapsed?: number;
  progress?: number;
};

export type BigMLResource = {
  resource: string;
  code: number;
  name?: string;
  description?: string;
  status: BigMLResourceStatus;
  created: string;
  updated: string;
  category?: number;
  tags?: string[];
  [key: string]: any;
};

export type BigMLListResponse = {
  meta: {
    limit: number;
    offset: number;
    total_count: number;
    next?: string;
    previous?: string;
  };
  objects: BigMLResource[];
};

let BASE_URLS: Record<BigMLRegion, string> = {
  us: 'https://bigml.io',
  au: 'https://au.bigml.io'
};

export class Client {
  private username: string;
  private token: string;
  private baseUrl: string;
  private pathPrefix: string;
  private organizationId?: string;
  private projectId?: string;

  constructor(config: BigMLConfig) {
    this.username = config.username;
    this.token = config.token;
    this.baseUrl = BASE_URLS[config.region];
    this.pathPrefix = config.devMode ? '/dev/andromeda' : '/andromeda';
    this.organizationId = config.organizationId;
    this.projectId = config.projectId;
  }

  private getAuthParams(): Record<string, string> {
    let params: Record<string, string> = {
      username: this.username,
      api_key: this.token
    };
    if (this.organizationId) {
      params.organization = this.organizationId;
    }
    if (this.projectId) {
      params.project = this.projectId;
    }
    return params;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: this.baseUrl
    });
  }

  async createResource(
    resourceType: string,
    body: Record<string, any>
  ): Promise<BigMLResource> {
    let ax = this.createAxiosInstance();
    let response = await ax.post(`${this.pathPrefix}/${resourceType}`, body, {
      params: this.getAuthParams(),
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getResource(resourceId: string, queryString?: string): Promise<BigMLResource> {
    let ax = this.createAxiosInstance();
    let params: Record<string, string> = { ...this.getAuthParams() };
    if (queryString) {
      let pairs = queryString.split(';');
      for (let pair of pairs) {
        let [key, value] = pair.split('=');
        if (key && value) {
          params[key] = value;
        }
      }
    }
    let response = await ax.get(`${this.pathPrefix}/${resourceId}`, {
      params
    });
    return response.data;
  }

  async listResources(
    resourceType: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      filters?: Record<string, string>;
      tags?: string;
      name?: string;
      project?: string;
    }
  ): Promise<BigMLListResponse> {
    let ax = this.createAxiosInstance();
    let params: Record<string, string> = { ...this.getAuthParams() };

    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.orderBy) params.order_by = options.orderBy;
    if (options?.tags) params.tags = options.tags;
    if (options?.name) params.name = options.name;
    if (options?.project) params.project = options.project;

    if (options?.filters) {
      for (let [key, value] of Object.entries(options.filters)) {
        params[key] = value;
      }
    }

    let response = await ax.get(`${this.pathPrefix}/${resourceType}`, {
      params
    });
    return response.data;
  }

  async updateResource(resourceId: string, body: Record<string, any>): Promise<BigMLResource> {
    let ax = this.createAxiosInstance();
    let response = await ax.put(`${this.pathPrefix}/${resourceId}`, body, {
      params: this.getAuthParams(),
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteResource(resourceId: string): Promise<void> {
    let ax = this.createAxiosInstance();
    await ax.delete(`${this.pathPrefix}/${resourceId}`, {
      params: this.getAuthParams()
    });
  }
}
