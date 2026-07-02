import { createAxios } from 'slates';

export class ToneDenClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.toneden.io/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Users ───────────────────────────────────────────────

  async getMe() {
    let response = await this.axios.get('/users/me');
    return response.data.user;
  }

  async getUser(userId: number | string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data.user;
  }

  async updateUser(userId: number | string, data: Record<string, any>) {
    let response = await this.axios.put(`/users/${userId}`, data);
    return response.data.user;
  }

  // ─── Ad Campaigns ───────────────────────────────────────

  async listCampaigns(
    userId: number | string,
    params?: { status?: string; offset?: number; limit?: number }
  ) {
    let response = await this.axios.get(`/users/${userId}/advertising/campaigns`, { params });
    return response.data.campaigns;
  }

  async getCampaign(campaignId: number) {
    let response = await this.axios.get(`/advertising/campaigns/${campaignId}`);
    return response.data.campaign;
  }

  async createCampaign(data: Record<string, any>) {
    let response = await this.axios.post('/advertising/campaigns', data);
    return response.data.campaign;
  }

  async updateCampaign(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/advertising/campaigns/${campaignId}`, data);
    return response.data.campaign;
  }

  async deleteCampaign(campaignId: number) {
    let response = await this.axios.delete(`/advertising/campaigns/${campaignId}`);
    return response.data;
  }

  async getCampaignInsights(campaignId: number) {
    let response = await this.axios.get(`/advertising/campaigns/${campaignId}/insights`);
    return response.data.insights;
  }

  async getCampaignCreativeInsights(campaignId: number) {
    let response = await this.axios.get(
      `/advertising/campaigns/${campaignId}/creativeInsights`
    );
    return response.data.ads;
  }

  // ─── Links (FanLinks) ──────────────────────────────────

  async listLinks(
    userId: number | string,
    params?: { targetType?: string; offset?: number; limit?: number }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.targetType) queryParams.target_type = params.targetType;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    let response = await this.axios.get(`/users/${userId}/links`, { params: queryParams });
    return response.data.links;
  }

  async getLink(linkId: number) {
    let response = await this.axios.get(`/links/${linkId}`);
    return response.data.link;
  }

  async createLink(data: Record<string, any>) {
    let response = await this.axios.post('/links', data);
    return response.data.link;
  }

  async updateLink(linkId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/links/${linkId}`, data);
    return response.data.link;
  }

  async deleteLink(linkId: number) {
    let response = await this.axios.delete(`/links/${linkId}`);
    return response.data;
  }

  async expandLink(params: { targetType: string; url?: string; upc?: string; isrc?: string }) {
    let queryParams: Record<string, any> = { target_type: params.targetType };
    if (params.url) queryParams.url = params.url;
    if (params.upc) queryParams.upc = params.upc;
    if (params.isrc) queryParams.isrc = params.isrc;
    let response = await this.axios.get('/links/expand', { params: queryParams });
    return response.data.link;
  }

  async validateLinkPath(params: { path: string; subdomain?: string; linkId?: number }) {
    let queryParams: Record<string, any> = { path: params.path };
    if (params.subdomain) queryParams.subdomain = params.subdomain;
    if (params.linkId) queryParams.link_id = params.linkId;
    let response = await this.axios.get('/links/validPath', { params: queryParams });
    return response.data;
  }

  async getLinkInsights(
    linkId: number,
    params?: {
      metric?: string;
      startDate?: string;
      endDate?: string;
      aggregateInterval?: string;
      aggregateGeo?: string;
      aggregateByReferrer?: boolean;
      aggregateByService?: boolean;
      forDistinctFans?: boolean;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.metric) queryParams.metric = params.metric;
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.aggregateInterval) queryParams.aggregate_interval = params.aggregateInterval;
    if (params?.aggregateGeo) queryParams.aggregate_geo = params.aggregateGeo;
    if (params?.aggregateByReferrer !== undefined)
      queryParams.aggregate_by_referrer = params.aggregateByReferrer;
    if (params?.aggregateByService !== undefined)
      queryParams.aggregate_by_service = params.aggregateByService;
    if (params?.forDistinctFans !== undefined)
      queryParams.for_distinct_fans = params.forDistinctFans;
    let response = await this.axios.get(`/links/${linkId}/insights`, { params: queryParams });
    return response.data.insights;
  }

  async getLinkInsightsOverview(linkId: number) {
    let response = await this.axios.get(`/links/${linkId}/insights/overview`);
    return response.data.insights;
  }

  // ─── Attachments (Social Unlocks & Contests) ──────────

  async listAttachments(
    userId: number | string,
    params: { type: string; offset?: number; limit?: number }
  ) {
    let queryParams: Record<string, any> = { type: params.type };
    if (params.offset !== undefined) queryParams.offset = params.offset;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    let response = await this.axios.get(`/users/${userId}/attachments`, {
      params: queryParams
    });
    return response.data.attachments;
  }

  async getAttachment(attachmentId: number) {
    let response = await this.axios.get(`/attachments/${attachmentId}`);
    return response.data.attachment;
  }

  async createAttachment(data: Record<string, any>) {
    let response = await this.axios.post('/attachments', data);
    return response.data.attachment;
  }

  async updateAttachment(attachmentId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/attachments/${attachmentId}`, data);
    return response.data.attachment;
  }

  async deleteAttachment(attachmentId: number) {
    let response = await this.axios.delete(`/attachments/${attachmentId}`);
    return response.data;
  }

  async getAttachmentEntries(
    attachmentId: number,
    params?: { aggregateInterval?: string; startDate?: string }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.aggregateInterval) queryParams.aggregate_interval = params.aggregateInterval;
    if (params?.startDate) queryParams.start_date = params.startDate;
    let response = await this.axios.get(`/attachments/${attachmentId}/entries`, {
      params: queryParams
    });
    return response.data.unlocks;
  }

  async getAttachmentEntryTotals(attachmentId: number) {
    let response = await this.axios.get(`/attachments/${attachmentId}/entries/totals`);
    return response.data.unlocks;
  }

  async getAttachmentUnlocks(
    attachmentId: number,
    params?: { aggregateInterval?: string; startDate?: string }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.aggregateInterval) queryParams.aggregate_interval = params.aggregateInterval;
    if (params?.startDate) queryParams.start_date = params.startDate;
    let response = await this.axios.get(`/attachments/${attachmentId}/unlocks`, {
      params: queryParams
    });
    return response.data.unlocks;
  }

  async getAttachmentUnlockTotals(attachmentId: number) {
    let response = await this.axios.get(`/attachments/${attachmentId}/unlocks/totals`);
    return response.data.unlocks;
  }

  async getAttachmentUnlockPlatforms(attachmentId: number) {
    let response = await this.axios.get(`/attachments/${attachmentId}/unlocks/platforms`);
    return response.data.unlocks;
  }

  // ─── Playbook Campaigns ────────────────────────────────

  async createPlaybookCampaign(data: Record<string, any>) {
    let response = await this.axios.post('/playbooks/campaigns', data);
    return response.data.campaign;
  }

  async getPlaybookCampaign(campaignId: number) {
    let response = await this.axios.get(`/playbooks/campaigns/${campaignId}`);
    return response.data.campaign;
  }

  async updatePlaybookCampaign(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/playbooks/campaigns/${campaignId}`, data);
    return response.data.campaign;
  }

  async deletePlaybookCampaign(campaignId: number) {
    let response = await this.axios.delete(`/playbooks/campaigns/${campaignId}`);
    return response.data;
  }

  // ─── User Lists ────────────────────────────────────────

  async listUserLists(userId: number | string) {
    let response = await this.axios.get(`/users/${userId}/advertising/userLists`);
    return response.data.lists;
  }

  async createUserList(data: { external_ad_account_id: string; type: string }) {
    let response = await this.axios.post('/advertising/userLists', data);
    return response.data.list;
  }

  async updateUserListContacts(
    listId: number,
    data: { add?: Record<string, any>[]; remove?: Record<string, any>[] }
  ) {
    let response = await this.axios.post(`/advertising/userLists/${listId}/contacts`, data);
    return response.data;
  }

  // ─── Offline Conversions ───────────────────────────────

  async uploadOfflineConversions(userId: number | string, conversions: Record<string, any>[]) {
    let response = await this.axios.post(`/users/${userId}/advertising/offlineConversions`, {
      conversions
    });
    return response.data;
  }
}
