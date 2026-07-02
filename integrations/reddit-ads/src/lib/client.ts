import { createAxios } from 'slates';

export class RedditAdsClient {
  private ax: ReturnType<typeof createAxios>;
  private accountId: string;

  constructor(config: { token: string; accountId: string }) {
    this.accountId = config.accountId;
    this.ax = createAxios({
      baseURL: 'https://ads-api.reddit.com/api/v3',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Account
  async getMe(): Promise<any> {
    let response = await this.ax.get('/me');
    return response.data;
  }

  async getAccounts(): Promise<any[]> {
    let response = await this.ax.get('/accounts');
    return response.data?.data || response.data || [];
  }

  async getAccount(): Promise<any> {
    let response = await this.ax.get(`/accounts/${this.accountId}`);
    return response.data?.data || response.data;
  }

  // Campaigns
  async listCampaigns(params?: { status?: string }): Promise<any[]> {
    let response = await this.ax.get(`/accounts/${this.accountId}/campaigns`, { params });
    return response.data?.data || response.data || [];
  }

  async getCampaign(campaignId: string): Promise<any> {
    let response = await this.ax.get(`/accounts/${this.accountId}/campaigns/${campaignId}`);
    return response.data?.data || response.data;
  }

  async createCampaign(data: Record<string, any>): Promise<any> {
    let response = await this.ax.post(`/accounts/${this.accountId}/campaigns`, data);
    return response.data?.data || response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let response = await this.ax.put(
      `/accounts/${this.accountId}/campaigns/${campaignId}`,
      data
    );
    return response.data?.data || response.data;
  }

  // Ad Groups
  async listAdGroups(params?: { campaignId?: string }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.campaignId) {
      queryParams.campaign_id = params.campaignId;
    }
    let response = await this.ax.get(`/accounts/${this.accountId}/ad_groups`, {
      params: queryParams
    });
    return response.data?.data || response.data || [];
  }

  async getAdGroup(adGroupId: string): Promise<any> {
    let response = await this.ax.get(`/accounts/${this.accountId}/ad_groups/${adGroupId}`);
    return response.data?.data || response.data;
  }

  async createAdGroup(data: Record<string, any>): Promise<any> {
    let response = await this.ax.post(`/accounts/${this.accountId}/ad_groups`, data);
    return response.data?.data || response.data;
  }

  async updateAdGroup(adGroupId: string, data: Record<string, any>): Promise<any> {
    let response = await this.ax.put(
      `/accounts/${this.accountId}/ad_groups/${adGroupId}`,
      data
    );
    return response.data?.data || response.data;
  }

  // Ads
  async listAds(params?: { adGroupId?: string }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.adGroupId) {
      queryParams.ad_group_id = params.adGroupId;
    }
    let response = await this.ax.get(`/accounts/${this.accountId}/ads`, {
      params: queryParams
    });
    return response.data?.data || response.data || [];
  }

  async getAd(adId: string): Promise<any> {
    let response = await this.ax.get(`/accounts/${this.accountId}/ads/${adId}`);
    return response.data?.data || response.data;
  }

  async createAd(data: Record<string, any>): Promise<any> {
    let response = await this.ax.post(`/accounts/${this.accountId}/ads`, data);
    return response.data?.data || response.data;
  }

  async updateAd(adId: string, data: Record<string, any>): Promise<any> {
    let response = await this.ax.put(`/accounts/${this.accountId}/ads/${adId}`, data);
    return response.data?.data || response.data;
  }

  // Custom Audiences
  async listCustomAudiences(): Promise<any[]> {
    let response = await this.ax.get(`/accounts/${this.accountId}/custom_audiences`);
    return response.data?.data || response.data || [];
  }

  async getCustomAudience(audienceId: string): Promise<any> {
    let response = await this.ax.get(
      `/accounts/${this.accountId}/custom_audiences/${audienceId}`
    );
    return response.data?.data || response.data;
  }

  async createCustomAudience(data: Record<string, any>): Promise<any> {
    let response = await this.ax.post(`/accounts/${this.accountId}/custom_audiences`, data);
    return response.data?.data || response.data;
  }

  async updateCustomAudience(audienceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.ax.put(
      `/accounts/${this.accountId}/custom_audiences/${audienceId}`,
      data
    );
    return response.data?.data || response.data;
  }

  async manageAudienceUsers(
    audienceId: string,
    data: {
      action_type: 'ADD' | 'REMOVE';
      column_order: string[];
      user_data: string[][];
    }
  ): Promise<any> {
    let response = await this.ax.patch(`/custom_audiences/${audienceId}/users`, data);
    return response.data?.data || response.data;
  }

  // Reporting
  async getReport(data: {
    start_date: string;
    end_date: string;
    level: string;
    metrics?: string[];
    breakdowns?: string[];
    campaign_ids?: string[];
    ad_group_ids?: string[];
    ad_ids?: string[];
  }): Promise<any> {
    let response = await this.ax.post(`/accounts/${this.accountId}/reports`, data);
    return response.data?.data || response.data;
  }

  // Funding Instruments
  async listFundingInstruments(): Promise<any[]> {
    let response = await this.ax.get(`/accounts/${this.accountId}/funding_instruments`);
    return response.data?.data || response.data || [];
  }
}
