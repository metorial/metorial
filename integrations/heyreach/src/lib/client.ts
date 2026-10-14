import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export interface LeadInput {
  profileUrl: string;
  firstName?: string;
  lastName?: string;
  location?: string;
  summary?: string;
  companyName?: string;
  position?: string;
  about?: string;
  emailAddress?: string;
  customUserFields?: Array<{ name: string; value: string }>;
}

export interface GetCampaignsParams {
  keyword?: string;
  statuses?: string[];
  accountIds?: number[];
  limit?: number;
  offset?: number;
}

export interface GetConversationsParams {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export interface GetStatsParams {
  dateFrom?: string;
  dateTo?: string;
  accountIds?: number[];
  campaignIds?: number[];
}

export interface GetLeadsFromListParams {
  listId: number;
  limit?: number;
  offset?: number;
  keyword?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface CreateWebhookParams {
  webhookName: string;
  webhookUrl: string;
  eventType: string;
  campaignIds?: number[];
}

export interface UpdateWebhookParams {
  webhookId: number;
  webhookName?: string;
  webhookUrl?: string;
  eventType?: string;
  isActive?: boolean;
  campaignIds?: number[];
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.heyreach.io/api/public',
      authHeader: { name: 'X-API-KEY', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HeyReach',
          reason: 'heyreach_api_error'
        })
    });
  }

  // ============ Auth ============

  async checkApiKey(): Promise<boolean> {
    let response = await this.http.get('/auth/CheckApiKey');
    return response.status >= 200 && response.status < 300;
  }

  // ============ Campaigns ============

  async getAllCampaigns(params?: GetCampaignsParams): Promise<any> {
    let response = await this.http.post('/campaign/GetAll', {
      keyword: params?.keyword ?? '',
      statuses: params?.statuses ?? [],
      accountIds: params?.accountIds ?? [],
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0
    });
    return response.data;
  }

  async getCampaignById(campaignId: number): Promise<any> {
    let response = await this.http.get('/campaign/GetById', {
      params: { campaignId }
    });
    return response.data;
  }

  async pauseCampaign(campaignId: number): Promise<any> {
    let response = await this.http.post('/campaign/Pause', null, {
      params: { campaignId }
    });
    return response.data;
  }

  async resumeCampaign(campaignId: number): Promise<any> {
    let response = await this.http.post('/campaign/Resume', null, {
      params: { campaignId }
    });
    return response.data;
  }

  // ============ Leads ============

  async addLeadsToCampaign(
    campaignId: number,
    leads: LeadInput[],
    linkedInAccountId?: number,
    resumeFinishedCampaign = true,
    resumePausedCampaign = true
  ): Promise<any> {
    let body = {
      campaignId,
      accountLeadPairs: leads.map(lead => ({
        lead,
        ...(linkedInAccountId === undefined ? {} : { linkedInAccountId })
      })),
      resumeFinishedCampaign,
      resumePausedCampaign
    };
    let response = await this.http.post('/campaign/AddLeadsToCampaign', body);
    return response.data;
  }

  async addLeadsToList(listId: number, leads: LeadInput[]): Promise<any> {
    let response = await this.http.post('/list/AddLeadsToListV2', {
      listId,
      leads
    });
    return response.data;
  }

  async getLeadDetails(profileUrl: string): Promise<any> {
    let response = await this.http.post('/lead/GetLead', { profileUrl });
    return response.data;
  }

  async getLeadsFromList(params: GetLeadsFromListParams): Promise<any> {
    let response = await this.http.post('/list/GetLeadsFromList', {
      listId: params.listId,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      keyword: params.keyword ?? '',
      createdFrom: params.createdFrom,
      createdTo: params.createdTo
    });
    return response.data;
  }

  async stopLeadInCampaign(
    campaignId: number,
    leadMemberId: string,
    leadUrl: string
  ): Promise<void> {
    await this.http.post('/campaign/StopLeadInCampaign', {
      campaignId,
      leadMemberId,
      leadUrl
    });
  }

  async deleteLeadsFromList(listId: number, profileUrls: string[]): Promise<any> {
    let response = await this.http.delete('/list/DeleteLeadsFromListByProfileUrl', {
      data: { listId, profileUrls }
    });
    return response.data;
  }

  // ============ Lists ============

  async getAllLists(limit?: number, offset?: number): Promise<any> {
    let response = await this.http.post('/list/GetAll', {
      limit: limit ?? 50,
      offset: offset ?? 0
    });
    return response.data;
  }

  async createEmptyList(name: string, type?: string): Promise<any> {
    let response = await this.http.post('/list/CreateEmptyList', {
      name,
      type: type ?? 'USER_LIST'
    });
    return response.data;
  }

  // ============ Conversations ============

  async getConversations(params?: GetConversationsParams): Promise<any> {
    let response = await this.http.post('/inbox/GetConversationsV2', {
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
      filters: params?.filters ?? {}
    });
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    accountId: number,
    message: string,
    subject = ''
  ): Promise<any> {
    let response = await this.http.post('/inbox/SendMessage', {
      conversationId,
      linkedInAccountId: accountId,
      message,
      subject
    });
    return response.data;
  }

  // ============ LinkedIn Accounts ============

  async getAllLinkedInAccounts(
    limit?: number,
    offset?: number,
    keyword?: string
  ): Promise<any> {
    let response = await this.http.post('/li_account/GetAll', {
      limit: limit ?? 50,
      offset: offset ?? 0,
      keyword: keyword ?? ''
    });
    return response.data;
  }

  async getMyNetworkForSender(linkedInAccountId: number): Promise<any> {
    let response = await this.http.get('/li_account/GetMyNetworkForSender', {
      params: { linkedInAccountId }
    });
    return response.data;
  }

  // ============ Stats ============

  async getOverallStats(params?: GetStatsParams): Promise<any> {
    let response = await this.http.post('/stats/GetOverallStats', {
      startDate: params?.dateFrom,
      endDate: params?.dateTo,
      accountIds: params?.accountIds ?? [],
      campaignIds: params?.campaignIds ?? []
    });
    return response.data;
  }

  // ============ Webhooks ============

  async createWebhook(params: CreateWebhookParams): Promise<any> {
    let response = await this.http.post('/webhook/Create', {
      webhookName: params.webhookName,
      webhookUrl: params.webhookUrl,
      eventType: params.eventType,
      campaignIds: params.campaignIds
    });
    return response.data;
  }

  async getAllWebhooks(limit?: number, offset?: number): Promise<any> {
    let response = await this.http.post('/webhook/GetAll', {
      limit: limit ?? 50,
      offset: offset ?? 0
    });
    return response.data;
  }

  async getWebhookById(webhookId: number): Promise<any> {
    let response = await this.http.get('/webhook/GetById', {
      params: { webhookId }
    });
    return response.data;
  }

  async updateWebhook(params: UpdateWebhookParams): Promise<any> {
    let response = await this.http.post('/webhook/Update', params);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<any> {
    let response = await this.http.delete('/webhook/Delete', {
      params: { webhookId }
    });
    return response.data;
  }
}
