import { createAxios } from 'slates';

export interface SendsparkAuth {
  apiKey: string;
  apiSecret: string;
  workspaceId: string;
}

export interface ProspectData {
  contactName: string;
  contactEmail: string;
  company?: string;
  jobTitle?: string;
  backgroundUrl?: string;
  screenshotUrl?: string;
}

export interface ProspectDepurationConfig {
  forceCreation?: boolean;
  payloadDepurationStrategy?: 'keep-first-valid' | 'keep-last-valid';
}

export interface AddProspectOptions {
  processAndAuthorizeCharge: boolean;
  prospectDepurationConfig?: ProspectDepurationConfig;
  prospect: ProspectData;
  webhookUrl?: string;
  webhookEvents?: string[];
}

export interface AddProspectsBulkOptions {
  processAndAuthorizeCharge: boolean;
  prospectDepurationConfig?: ProspectDepurationConfig;
  prospectList: ProspectData[];
}

export interface ListCampaignsOptions {
  offset?: number;
  limit?: number;
  filters?: string;
  search?: string;
}

export class Client {
  private axios;
  private workspaceId: string;

  constructor(auth: SendsparkAuth) {
    this.workspaceId = auth.workspaceId;
    this.axios = createAxios({
      baseURL: 'https://api-gw.sendspark.com/v1',
      headers: {
        'x-api-key': auth.apiKey,
        'x-api-secret': auth.apiSecret,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async healthCheck(): Promise<{ message: string }> {
    let response = await this.axios.get('/auth/health');
    return response.data;
  }

  async listCampaigns(options?: ListCampaignsOptions): Promise<any> {
    let params: Record<string, any> = {};
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.filters) params.filters = options.filters;
    if (options?.search) params.search = options.search;

    let response = await this.axios.get(`/workspaces/${this.workspaceId}/dynamics`, {
      params
    });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<any> {
    let response = await this.axios.get(
      `/workspaces/${this.workspaceId}/dynamics/${campaignId}`
    );
    return response.data;
  }

  async createCampaign(name: string): Promise<any> {
    let response = await this.axios.post(`/workspaces/${this.workspaceId}/dynamics`, { name });
    return response.data;
  }

  async addProspect(campaignId: string, options: AddProspectOptions): Promise<any> {
    let response = await this.axios.post(
      `/workspaces/${this.workspaceId}/dynamics/${campaignId}/prospect`,
      options
    );
    return response.data;
  }

  async addProspectsBulk(campaignId: string, options: AddProspectsBulkOptions): Promise<any> {
    let response = await this.axios.post(
      `/workspaces/${this.workspaceId}/dynamics/${campaignId}/prospects/bulk`,
      options
    );
    return response.data;
  }

  async getProspect(campaignId: string, email: string): Promise<any> {
    let response = await this.axios.get(
      `/workspaces/${this.workspaceId}/dynamics/${campaignId}/prospects/${encodeURIComponent(email)}`
    );
    return response.data;
  }
}
