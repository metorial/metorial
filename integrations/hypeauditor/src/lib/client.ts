import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  extractApiErrorMessage,
  getResponseHeaderValue,
  isApiErrorRecord,
  type SlateAxiosErrorOptions
} from 'slates';

let errorDetails = {
  detailKeys: ['description', 'message', 'detail', 'error_message', 'error_description'],
  nestedKeys: ['error', 'errors']
};

let errorMapping: SlateAxiosErrorOptions = {
  mapAxiosError(error, inferred) {
    let data = error.response?.data;
    let providerError = isApiErrorRecord(data) ? data.error : undefined;
    let code = isApiErrorRecord(providerError) ? providerError.code : undefined;
    return {
      message: extractApiErrorMessage(error, errorDetails),
      upstream: {
        ...inferred.upstream,
        ...(typeof code === 'number' || typeof code === 'string' ? { code: String(code) } : {})
      }
    };
  }
};

let serviceError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'HypeAuditor',
    reason: 'hypeauditor_api_error',
    operation,
    ...errorDetails,
    extractUpstreamCode(error) {
      if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return undefined;
      let upstream = error.data.upstream;
      return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
        ? upstream.code
        : undefined;
    }
  });

let checkResponse = (data: any, operation: string) => {
  if (isApiErrorRecord(data) && data.error) {
    throw buildApiServiceError(
      { response: { data, status: 200 } },
      {
        providerLabel: 'HypeAuditor',
        reason: 'hypeauditor_api_error',
        operation,
        ...errorDetails,
        extractUpstreamCode() {
          let code = isApiErrorRecord(data.error) ? data.error.code : undefined;
          return typeof code === 'string' || typeof code === 'number'
            ? String(code)
            : undefined;
        }
      }
    );
  }
  return data;
};

let apiAxios = createAxios({
  baseURL: 'https://hypeauditor.com/api/method',
  errorMapping
});

let marketAnalysisAxios = createAxios({
  baseURL: 'https://hypeauditor.com/api/marketanalysis',
  errorMapping
});

let pdfAxios = createAxios({ errorMapping });

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
    try {
      let response = await apiAxios.get(`/${endpoint}`, {
        headers: this.headers,
        params: { v: this.apiVersion, ...params }
      });
      return checkResponse(response.data, endpoint);
    } catch (error) {
      throw serviceError(error, endpoint);
    }
  }

  private async apiPost(
    endpoint: string,
    data?: Record<string, any>,
    params?: Record<string, any>
  ) {
    try {
      let response = await apiAxios.post(`/${endpoint}`, data, {
        headers: this.headers,
        params: { v: this.apiVersion, ...params }
      });
      return checkResponse(response.data, endpoint);
    } catch (error) {
      throw serviceError(error, endpoint);
    }
  }

  private async marketAnalysisGet(endpoint: string, params?: Record<string, any>) {
    try {
      let response = await marketAnalysisAxios.get(`/${endpoint}`, {
        headers: this.headers,
        params
      });
      return checkResponse(response.data, endpoint);
    } catch (error) {
      throw serviceError(error, endpoint);
    }
  }

  private async marketAnalysisPost(endpoint: string, data?: Record<string, any>) {
    try {
      let response = await marketAnalysisAxios.post(`/${endpoint}`, data, {
        headers: this.headers
      });
      return checkResponse(response.data, endpoint);
    } catch (error) {
      throw serviceError(error, endpoint);
    }
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
    if (page !== undefined) params.page = page;
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

  async getPdfContent(pdfUrl: string) {
    let url: URL;
    try {
      url = new URL(pdfUrl);
    } catch {
      throw createApiServiceError('HypeAuditor returned an invalid PDF download URL.');
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'cdn.hypeauditor.com' ||
      url.username ||
      url.password
    ) {
      throw createApiServiceError('HypeAuditor returned an unsupported PDF download URL.');
    }
    try {
      let response = await pdfAxios.get<ArrayBuffer>(url.toString(), {
        responseType: 'arraybuffer',
        maxRedirects: 0
      });
      let mimeType = getResponseHeaderValue(response.headers, 'content-type')
        ?.split(';')[0]
        ?.trim()
        .toLowerCase();
      let bytes = new Uint8Array(response.data);
      if (
        response.status !== 200 ||
        (mimeType !== 'application/pdf' && mimeType !== 'application/octet-stream') ||
        new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-'
      ) {
        throw createApiServiceError('HypeAuditor did not return a valid PDF file.');
      }
      return new Response(bytes, { headers: { 'Content-Type': 'application/pdf' } });
    } catch (error) {
      throw serviceError(error, 'PDF download');
    }
  }

  // ==================== DISCOVERY ====================

  async discoverInfluencers(filters: Record<string, any>, page?: number, sandbox?: boolean) {
    let endpoint = sandbox ? 'auditor.searchSandbox' : 'auditor.search';
    let data: Record<string, any> = { ...filters };
    if (page !== undefined) data.page = page;
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
      audience_geo: params.audienceGeo ?? [],
      hashtags: params.hashtags ?? []
    });
  }

  async getCompetitorAnalysis(reportId: string) {
    return this.marketAnalysisGet(
      `instagramCompetitorAnalysis/${encodeURIComponent(reportId)}`
    );
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
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
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
    cursor?: number | string;
    creatorIds?: string;
    creatorAccounts?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.reportUnlockedFrom)
      queryParams.report_unlocked_from = params.reportUnlockedFrom;
    if (params?.reportUnlockedTo) queryParams.report_unlocked_to = params.reportUnlockedTo;
    if (params?.cursor !== undefined) queryParams.cursor = params.cursor;
    if (params?.creatorIds) queryParams.creator_ids = params.creatorIds;
    if (params?.creatorAccounts) queryParams.creator_accounts = params.creatorAccounts;
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
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    return this.apiGet('auditor.reportsUnlocked', queryParams);
  }

  // ==================== TAXONOMY ====================

  async getTaxonomy() {
    return this.apiGet('auditor.taxonomy');
  }

  async getKeywordPosts(socialNetwork: string, contentIds: string[]) {
    return this.apiGet('auditor.searchKeywordsPosts', {
      socialNetwork,
      contentIds: contentIds.join(',')
    });
  }
}
