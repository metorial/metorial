import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

export interface SendsparkAuth {
  apiKey: string;
  apiSecret: string;
  workspaceId?: string;
}

export interface ProspectData {
  contactName: string;
  contactEmail: string;
  company?: string;
  jobTitle?: string;
  backgroundUrl?: string;
  screenshotUrl?: string;
  customField?: string;
  fields?: Record<string, unknown>;
  webhookUrl?: string;
  webhookEvents?: string[];
}

export interface ProspectDepurationConfig {
  forceCreation?: boolean;
  payloadDepurationStrategy?: 'keep-first-valid' | 'keep-last-valid';
}

export interface AddProspectOptions {
  processAndAuthorizeCharge: boolean;
  prospectDepurationConfig?: ProspectDepurationConfig;
  prospect: ProspectData;
  fallbackToEmailDomainForBackground?: boolean;
  callbackId?: string;
}

export interface AddProspectsBulkOptions {
  processAndAuthorizeCharge: boolean;
  prospectDepurationConfig?: ProspectDepurationConfig;
  prospectList: ProspectData[];
  callbackId?: string;
}

export interface ListCampaignsOptions {
  offset?: number;
  limit?: number;
  filters?: string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
}

export let toSendsparkError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Sendspark',
    reason: 'sendspark_api_error',
    operation,
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    nestedKeys: ['errors', 'message', 'validationDetails'],
    detailKeys: ['message', 'error', 'code', 'validationMessage']
  });

export class Client {
  private axios;
  private workspaceId?: string;

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

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await run()).data;
    } catch (error) {
      throw toSendsparkError(error, operation);
    }
  }

  async getWorkspace(): Promise<{ workspaceId: string }> {
    let workspace = await this.request<{ workspaceId: string }>(
      'Get connected workspace',
      () => this.axios.get('/workspaces/identifier')
    );
    if (typeof workspace?.workspaceId !== 'string' || !workspace.workspaceId) {
      throw createApiServiceError('Sendspark did not return the connected workspace ID.');
    }
    return workspace;
  }

  async listWorkspaces(): Promise<any> {
    return this.request('List workspaces', () => this.axios.get('/workspaces'));
  }

  private async workspacePath() {
    if (this.workspaceId === undefined) {
      this.workspaceId = (await this.getWorkspace()).workspaceId;
    }
    return `/workspaces/${encodeURIComponent(this.workspaceId)}`;
  }

  async healthCheck(): Promise<{ message: string }> {
    return this.request('Check API health', () => this.axios.get('/auth/health'));
  }

  async listCampaigns(options?: ListCampaignsOptions): Promise<any> {
    let params: Record<string, string | number> = {};
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.filters) params.filters = options.filters;
    if (options?.search) params.search = options.search;
    if (options?.sortOrder !== undefined) params.sortOrder = options.sortOrder;
    let path = `${await this.workspacePath()}/dynamics`;
    return this.request('List campaigns', () => this.axios.get(path, { params }));
  }

  async getCampaign(campaignId: string): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics/${encodeURIComponent(campaignId)}`;
    return this.request('Get campaign', () => this.axios.get(path));
  }

  async createCampaign(name: string): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics`;
    return this.request('Create campaign', () => this.axios.post(path, { name }));
  }

  async addProspect(campaignId: string, options: AddProspectOptions): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics/${encodeURIComponent(campaignId)}/prospect`;
    return this.request('Add prospect', () => this.axios.post(path, options));
  }

  async addProspectsBulk(campaignId: string, options: AddProspectsBulkOptions): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics/${encodeURIComponent(campaignId)}/prospects/bulk`;
    return this.request('Add prospects in bulk', () => this.axios.post(path, options));
  }

  async getProspect(campaignId: string, email: string, include?: string): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics/${encodeURIComponent(campaignId)}/prospects/${encodeURIComponent(email)}`;
    return this.request('Get prospect', () =>
      this.axios.get(path, { params: include === undefined ? undefined : { include } })
    );
  }

  async getDynamicsSettings(): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics/settings`;
    return this.request('Get personalization settings', () => this.axios.get(path));
  }

  async updateCampaignSettings(campaignId: string, useFallbackData: boolean): Promise<any> {
    let path = `${await this.workspacePath()}/dynamics/${encodeURIComponent(campaignId)}/settings`;
    return this.request('Update campaign settings', () =>
      this.axios.patch(path, { useFallbackData })
    );
  }

  async getTranscript(campaignId: string): Promise<any> {
    let path = `${await this.workspacePath()}/campaigns/${encodeURIComponent(campaignId)}/transcript`;
    return this.request('Get campaign transcript', () => this.axios.get(path));
  }

  async getTranscriptStatus(campaignId: string): Promise<any> {
    let path = `${await this.workspacePath()}/campaigns/${encodeURIComponent(campaignId)}/transcript/status`;
    return this.request('Get campaign transcript status', () => this.axios.get(path));
  }

  async transcriptDownloadUrl(campaignId: string) {
    return `https://api-gw.sendspark.com/v1${await this.workspacePath()}/campaigns/${encodeURIComponent(campaignId)}/transcript`;
  }
}

export let createClient = (ctx: {
  auth: SendsparkAuth;
  config: Record<string, unknown>;
  input?: { workspaceId?: string };
}) =>
  new Client({
    ...ctx.auth,
    // Retain saved workspace routing for existing connections, including empty strings.
    workspaceId:
      ctx.input?.workspaceId ??
      (typeof ctx.config.workspaceId === 'string'
        ? ctx.config.workspaceId
        : ctx.auth.workspaceId)
  });
