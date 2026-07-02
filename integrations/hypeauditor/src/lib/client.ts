import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://hypeauditor.com/api/method'
});

let marketAnalysisAxios = createAxios({
  baseURL: 'https://hypeauditor.com/api/marketanalysis'
});

export type SocialNetwork =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'twitch'
  | 'snapchat';

export interface ClientConfig {
  token: string;
  clientId: string;
  apiVersion?: string;
}

export class Client {
  private token: string;
  private clientId: string;
  private apiVersion: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.clientId = config.clientId;
    this.apiVersion = config.apiVersion ?? '2';
  }

  private get headers() {
    return {
      'X-Auth-Token': this.token,
      'X-Auth-Id': this.clientId
    };
  }

  private async apiGet(endpoint: string, params?: Record<string, any>) {
    let response = await apiAxios.get(`/${endpoint}`, {
      headers: this.headers,
      params: { v: this.apiVersion, ...params }
    });
    return response.data;
  }

  private async apiPost(
    endpoint: string,
    data?: Record<string, any>,
    params?: Record<string, any>
  ) {
    let response = await apiAxios.post(`/${endpoint}`, data, {
      headers: this.headers,
      params: { v: this.apiVersion, ...params }
    });
    return response.data;
  }

  private async marketAnalysisGet(endpoint: string, params?: Record<string, any>) {
    let response = await marketAnalysisAxios.get(`/${endpoint}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  private async marketAnalysisPost(endpoint: string, data?: Record<string, any>) {
    let response = await marketAnalysisAxios.post(`/${endpoint}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== SUGGESTER ====================

  async searchInfluencers(
    search: string,
    options?: { socialNetwork?: string; excludeNetworks?: string }
  ) {
    let params: Record<string, any> = { search };
    if (options?.socialNetwork) params.st = options.socialNetwork;
    if (options?.excludeNetworks) params.exclSt = options.excludeNetworks;
    return this.apiGet('auditor.suggester', params);
  }

  // ==================== REPORTS ====================

  async getInstagramReport(username: string, features?: string) {
    let params: Record<string, any> = { username };
    if (features) params.features = features;
    return this.apiGet('auditor.report', params);
  }

  async getInstagramReportByUserId(userId: string, features?: string) {
    let params: Record<string, any> = { user_id: userId };
    if (features) params.features = features;
    return this.apiGet('auditor.reportByUserId', params);
  }

  async getYoutubeReport(channel: string, features?: string) {
    let params: Record<string, any> = { channel };
    if (features) params.features = features;
    return this.apiGet('auditor.youtube', params);
  }

  async getTiktokReport(channel: string) {
    return this.apiGet('auditor.tiktok', { channel });
  }

  async getTiktokReportByUserId(userId: string) {
    return this.apiGet('auditor.tiktokByUserId', { user_id: userId });
  }

  async getTwitterReport(channel: string) {
    return this.apiGet('auditor.twitter', { channel });
  }

  async getTwitchReport(channel: string) {
    return this.apiGet('auditor.twitch', { channel });
  }

  async getSnapchatReport(channel: string) {
    return this.apiGet('auditor.snapchat', { channel });
  }

  // ==================== ACCOUNT MEDIA ====================

  async getInstagramMedia(username: string) {
    return this.apiGet('auditor.reportMedia', { username });
  }

  async getYoutubeMedia(channel: string, page?: number) {
    let params: Record<string, any> = { channel };
    if (page) params.page = page;
    return this.apiGet('auditor.youtubeMedia', params);
  }

  async getTiktokMedia(channelId: string) {
    return this.apiGet('auditor.tiktokMedia', { channelId });
  }

  // ==================== METRICS HISTORY ====================

  async getInstagramHistory(username: string) {
    return this.apiGet('auditor.instagramHistory', { username });
  }

  async getTiktokHistory(channel: string) {
    return this.apiGet('auditor.tiktokHistory', { channel });
  }

  async getTwitterHistory(channel: string) {
    return this.apiGet('auditor.twitterHistory', { channel });
  }

  async getTwitchHistory(channel: string) {
    return this.apiGet('auditor.twitchHistory', { channel });
  }

  // ==================== BRAND MENTIONS ====================

  async getYoutubeBrandMentions(channel: string) {
    return this.apiGet('auditor.youtubeBrandMentions', { channel });
  }

  async getTiktokBrandMentions(channel: string) {
    return this.apiGet('auditor.tiktokBrandMentions', { channel });
  }

  // ==================== REPORT CONNECTIONS ====================

  async getReportConnections(username: string, socialNetwork: SocialNetwork) {
    return this.apiGet('auditor.reportConnections', { username, type: socialNetwork });
  }

  // ==================== PDF EXPORT ====================

  async getInstagramPdf(username: string) {
    return this.apiGet('auditor.instagramPdf', { username });
  }

  async getYoutubePdf(channel: string) {
    return this.apiGet('auditor.youtubePdf', { channel });
  }

  async getTiktokPdf(channel: string) {
    return this.apiGet('auditor.tiktokPdf', { channel });
  }

  async getTwitterPdf(channel: string) {
    return this.apiGet('auditor.twitterPdf', { channel });
  }

  async getTwitchPdf(channel: string) {
    return this.apiGet('auditor.twitchPdf', { channel });
  }

  async getSnapchatPdf(channel: string) {
    return this.apiGet('auditor.snapchatPdf', { channel });
  }

  // ==================== DISCOVERY ====================

  async discoverInfluencers(filters: Record<string, any>, page?: number, sandbox?: boolean) {
    let endpoint = sandbox ? 'auditor.searchSandbox' : 'auditor.search';
    let data: Record<string, any> = { ...filters };
    if (page) data.page = page;
    return this.apiPost(endpoint, data);
  }

  // ==================== MARKET ANALYSIS ====================

  async createCompetitorAnalysis(params: {
    username: string;
    dateFrom: string;
    dateTo: string;
    audienceGeo?: string[];
    hashtags?: string[];
  }) {
    return this.marketAnalysisPost('instagramCompetitorAnalysis', {
      username: params.username,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      audience_geo: params.audienceGeo,
      hashtags: params.hashtags
    });
  }

  async getCompetitorAnalysis(reportId: string) {
    return this.marketAnalysisGet(`instagramCompetitorAnalysis/${reportId}`);
  }

  async getCompetitorAnalysisPosts(reportId: string, page?: number, size?: number) {
    return this.marketAnalysisPost('instagramCompetitorAnalysis/posts', {
      report_id: reportId,
      from: page,
      size
    });
  }

  // ==================== LISTS ====================

  async getLists() {
    return this.apiGet('auditor.lists');
  }

  async getListReports(listId: number, limit?: number, offset?: number) {
    let params: Record<string, any> = { id: listId };
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    return this.apiGet('auditor.list', params);
  }

  async addToList(listId: number, channelId: string, socialNetwork: SocialNetwork) {
    return this.apiGet('auditor.addToList', {
      list_id: listId,
      channel_id: channelId,
      type: socialNetwork
    });
  }

  async removeFromList(reportId: number, listId: number) {
    return this.apiGet('auditor.removeFromList', {
      report_id: reportId,
      list_id: listId
    });
  }

  // ==================== MY NETWORK ====================

  async getCreators(params?: {
    limit?: number;
    reportUnlockedFrom?: string;
    reportUnlockedTo?: string;
    cursor?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.reportUnlockedFrom)
      queryParams.report_unlocked_from = params.reportUnlockedFrom;
    if (params?.reportUnlockedTo) queryParams.report_unlocked_to = params.reportUnlockedTo;
    if (params?.cursor) queryParams.cursor = params.cursor;
    return this.apiGet('auditor.creators', queryParams);
  }

  // ==================== ACCOUNT ACTIVITY ====================

  async getUnlockedReports(params?: {
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    offset?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;
    if (params?.offset) queryParams.offset = params.offset;
    return this.apiGet('auditor.reportsUnlocked', queryParams);
  }

  // ==================== TAXONOMY ====================

  async getTaxonomy() {
    return this.apiGet('auditor.taxonomy', { v: '1' });
  }
}
