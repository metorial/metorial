import { createAxios } from '@slates/provider';
import { pinterestApiError } from './errors';

let httpClient = createAxios({
  baseURL: 'https://api.pinterest.com/v5'
});

httpClient.interceptors.response.use(
  response => response,
  error => Promise.reject(pinterestApiError(error))
);

export interface PaginatedResponse<T> {
  items: T[];
  bookmark: string | null;
}

export interface PinData {
  id: string;
  created_at: string;
  link: string;
  title: string;
  description: string;
  dominant_color: string;
  alt_text: string;
  board_id: string;
  board_section_id: string;
  board_owner: Record<string, any>;
  media: Record<string, any>;
  parent_pin_id: string;
  note: string;
  pin_metrics: Record<string, any>;
  creative_type: string;
  is_standard: boolean;
}

export interface BoardData {
  id: string;
  created_at: string;
  name: string;
  description: string;
  owner: Record<string, any>;
  privacy: string;
  pin_count: number;
  follower_count: number;
  collaborator_count: number;
  board_pins_modified_at: string;
  media: Record<string, any>;
}

export interface BoardSectionData {
  id: string;
  name: string;
}

export interface UserAccountData {
  username: string;
  profile_image: string;
  website_url: string;
  account_type: string;
  board_count: number;
  pin_count: number;
  follower_count: number;
  following_count: number;
  monthly_views: number;
}

export interface AdAccountData {
  id: string;
  name: string;
  owner: Record<string, any>;
  country: string;
  currency: string;
  created_time: number;
  updated_time: number;
  permissions: string[];
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ── Pins ──

  async createPin(params: {
    boardId: string;
    boardSectionId?: string;
    title?: string;
    description?: string;
    link?: string;
    altText?: string;
    mediaSource: {
      sourceType: string;
      url?: string;
      data?: string;
      contentType?: string;
      mediaId?: string;
      coverImageUrl?: string;
      coverImageData?: string;
      coverImageContentType?: string;
      coverImageKeyFrameTime?: number;
      index?: number;
      isAffiliateLink?: boolean;
      isStandard?: boolean;
      items?: Array<{
        title?: string;
        description?: string;
        link?: string;
        url?: string;
        data?: string;
        contentType?: string;
      }>;
    };
    note?: string;
  }) {
    let body: Record<string, any> = {
      board_id: params.boardId,
      media_source: {
        source_type: params.mediaSource.sourceType
      }
    };

    if (params.boardSectionId) body.board_section_id = params.boardSectionId;
    if (params.title) body.title = params.title;
    if (params.description) body.description = params.description;
    if (params.link) body.link = params.link;
    if (params.altText) body.alt_text = params.altText;
    if (params.note) body.note = params.note;

    let ms = body.media_source;
    if (params.mediaSource.url) ms.url = params.mediaSource.url;
    if (params.mediaSource.data) ms.data = params.mediaSource.data;
    if (
      params.mediaSource.contentType &&
      params.mediaSource.sourceType !== 'image_url' &&
      params.mediaSource.sourceType !== 'multiple_image_urls'
    ) {
      ms.content_type = params.mediaSource.contentType;
    }
    if (params.mediaSource.mediaId) ms.media_id = params.mediaSource.mediaId;
    if (params.mediaSource.coverImageUrl)
      ms.cover_image_url = params.mediaSource.coverImageUrl;
    if (params.mediaSource.coverImageData)
      ms.cover_image_data = params.mediaSource.coverImageData;
    if (params.mediaSource.coverImageContentType)
      ms.cover_image_content_type = params.mediaSource.coverImageContentType;
    if (params.mediaSource.coverImageKeyFrameTime !== undefined)
      ms.cover_image_key_frame_time = params.mediaSource.coverImageKeyFrameTime;
    if (params.mediaSource.index !== undefined) ms.index = params.mediaSource.index;
    if (params.mediaSource.isAffiliateLink !== undefined)
      ms.is_affiliate_link = params.mediaSource.isAffiliateLink;
    if (params.mediaSource.isStandard !== undefined)
      ms.is_standard = params.mediaSource.isStandard;
    if (params.mediaSource.items) {
      ms.items = params.mediaSource.items.map(item => ({
        title: item.title,
        description: item.description,
        link: item.link,
        url: item.url,
        data: item.data,
        content_type: item.data ? item.contentType : undefined
      }));
    }

    let response = await httpClient.post('/pins', body, {
      headers: this.headers()
    });

    return response.data;
  }

  async getPin(pinId: string, adAccountId?: string) {
    let params: Record<string, string> = {};
    if (adAccountId) params.ad_account_id = adAccountId;

    let response = await httpClient.get(`/pins/${pinId}`, {
      headers: this.headers(),
      params
    });

    return response.data;
  }

  async listPins(params?: {
    bookmark?: string;
    pageSize?: number;
    pinFilter?: string;
    includeProtectedPins?: boolean;
    pinType?: string;
    adAccountId?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.pinFilter) queryParams.pin_filter = params.pinFilter;
    if (params?.includeProtectedPins !== undefined)
      queryParams.include_protected_pins = params.includeProtectedPins;
    if (params?.pinType) queryParams.pin_type = params.pinType;
    if (params?.adAccountId) queryParams.ad_account_id = params.adAccountId;

    let response = await httpClient.get('/pins', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data as PaginatedResponse<PinData>;
  }

  async updatePin(
    pinId: string,
    params: {
      boardId?: string;
      boardSectionId?: string;
      title?: string;
      description?: string;
      link?: string;
      altText?: string;
      note?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.boardId) body.board_id = params.boardId;
    if (params.boardSectionId) body.board_section_id = params.boardSectionId;
    if (params.title !== undefined) body.title = params.title;
    if (params.description !== undefined) body.description = params.description;
    if (params.link !== undefined) body.link = params.link;
    if (params.altText !== undefined) body.alt_text = params.altText;
    if (params.note !== undefined) body.note = params.note;

    let response = await httpClient.patch(`/pins/${pinId}`, body, {
      headers: this.headers()
    });

    return response.data;
  }

  async deletePin(pinId: string, adAccountId?: string) {
    let params: Record<string, string> = {};
    if (adAccountId) params.ad_account_id = adAccountId;

    await httpClient.delete(`/pins/${pinId}`, {
      headers: this.headers(),
      params
    });
  }

  async savePin(
    pinId: string,
    params: { boardId: string; boardSectionId?: string; adAccountId?: string }
  ) {
    let body: Record<string, any> = {
      board_id: params.boardId
    };
    if (params.boardSectionId) body.board_section_id = params.boardSectionId;

    let queryParams: Record<string, string> = {};
    if (params.adAccountId) queryParams.ad_account_id = params.adAccountId;

    let response = await httpClient.post(`/pins/${pinId}/save`, body, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async getPinAnalytics(
    pinId: string,
    params: {
      startDate: string;
      endDate: string;
      metricTypes: string[];
      appTypes?: string;
      splitField?: string;
      adAccountId?: string;
    }
  ) {
    let queryParams: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate,
      metric_types: params.metricTypes.join(',')
    };
    if (params.appTypes) queryParams.app_types = params.appTypes;
    if (params.splitField) queryParams.split_field = params.splitField;
    if (params.adAccountId) queryParams.ad_account_id = params.adAccountId;

    let response = await httpClient.get(`/pins/${pinId}/analytics`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Boards ──

  async createBoard(params: { name: string; description?: string; privacy?: string }) {
    let body: Record<string, any> = {
      name: params.name
    };
    if (params.description) body.description = params.description;
    if (params.privacy) body.privacy = params.privacy;

    let response = await httpClient.post('/boards', body, {
      headers: this.headers()
    });

    return response.data;
  }

  async getBoard(boardId: string) {
    let response = await httpClient.get(`/boards/${boardId}`, {
      headers: this.headers()
    });

    return response.data;
  }

  async listBoards(params?: { bookmark?: string; pageSize?: number; privacy?: string }) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.privacy) queryParams.privacy = params.privacy;

    let response = await httpClient.get('/boards', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data as PaginatedResponse<BoardData>;
  }

  async updateBoard(
    boardId: string,
    params: {
      name?: string;
      description?: string;
      privacy?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.privacy !== undefined) body.privacy = params.privacy;

    let response = await httpClient.patch(`/boards/${boardId}`, body, {
      headers: this.headers()
    });

    return response.data;
  }

  async deleteBoard(boardId: string) {
    await httpClient.delete(`/boards/${boardId}`, {
      headers: this.headers()
    });
  }

  async listBoardPins(
    boardId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get(`/boards/${boardId}/pins`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data as PaginatedResponse<PinData>;
  }

  // ── Board Sections ──

  async createBoardSection(boardId: string, name: string) {
    let response = await httpClient.post(
      `/boards/${boardId}/sections`,
      { name },
      {
        headers: this.headers()
      }
    );

    return response.data;
  }

  async listBoardSections(
    boardId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get(`/boards/${boardId}/sections`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data as PaginatedResponse<BoardSectionData>;
  }

  async updateBoardSection(boardId: string, sectionId: string, name: string) {
    let response = await httpClient.patch(
      `/boards/${boardId}/sections/${sectionId}`,
      { name },
      {
        headers: this.headers()
      }
    );

    return response.data;
  }

  async deleteBoardSection(boardId: string, sectionId: string) {
    await httpClient.delete(`/boards/${boardId}/sections/${sectionId}`, {
      headers: this.headers()
    });
  }

  async listBoardSectionPins(
    boardId: string,
    sectionId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get(`/boards/${boardId}/sections/${sectionId}/pins`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data as PaginatedResponse<PinData>;
  }

  // ── User Account ──

  async getUserAccount() {
    let response = await httpClient.get('/user_account', {
      headers: this.headers()
    });

    return response.data;
  }

  async getUserAccountAnalytics(params: {
    startDate: string;
    endDate: string;
    metricTypes: string[];
    fromClaimedContent?: string;
    pinFormat?: string;
    appTypes?: string;
    contentType?: string;
    source?: string;
    splitField?: string;
  }) {
    let queryParams: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate,
      metric_types: params.metricTypes.join(',')
    };
    if (params.fromClaimedContent)
      queryParams.from_claimed_content = params.fromClaimedContent;
    if (params.pinFormat) queryParams.pin_format = params.pinFormat;
    if (params.appTypes) queryParams.app_types = params.appTypes;
    if (params.contentType) queryParams.content_type = params.contentType;
    if (params.source) queryParams.source = params.source;
    if (params.splitField) queryParams.split_field = params.splitField;

    let response = await httpClient.get('/user_account/analytics', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Ad Accounts ──

  async listAdAccounts(params?: {
    bookmark?: string;
    pageSize?: number;
    includeSharedAccounts?: boolean;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.includeSharedAccounts !== undefined)
      queryParams.include_shared_accounts = params.includeSharedAccounts;

    let response = await httpClient.get('/ad_accounts', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data as PaginatedResponse<AdAccountData>;
  }

  async getAdAccount(adAccountId: string) {
    let response = await httpClient.get(`/ad_accounts/${adAccountId}`, {
      headers: this.headers()
    });

    return response.data;
  }

  async getAdAccountAnalytics(
    adAccountId: string,
    params: {
      startDate: string;
      endDate: string;
      columns: string[];
      granularity: string;
      clickWindowDays?: number;
      engagementWindowDays?: number;
      viewWindowDays?: number;
      conversionReportTime?: string;
    }
  ) {
    let queryParams: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate,
      columns: params.columns.join(','),
      granularity: params.granularity
    };
    if (params.clickWindowDays) queryParams.click_window_days = params.clickWindowDays;
    if (params.engagementWindowDays)
      queryParams.engagement_window_days = params.engagementWindowDays;
    if (params.viewWindowDays) queryParams.view_window_days = params.viewWindowDays;
    if (params.conversionReportTime)
      queryParams.conversion_report_time = params.conversionReportTime;

    let response = await httpClient.get(`/ad_accounts/${adAccountId}/analytics`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Campaigns ──

  async listCampaigns(
    adAccountId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
      campaignIds?: string[];
      entityStatuses?: string[];
      orderBy?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.campaignIds?.length) queryParams.campaign_ids = params.campaignIds.join(',');
    if (params?.entityStatuses?.length)
      queryParams.entity_statuses = params.entityStatuses.join(',');
    if (params?.orderBy) queryParams.order = params.orderBy;

    let response = await httpClient.get(`/ad_accounts/${adAccountId}/campaigns`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async getCampaignAnalytics(
    adAccountId: string,
    params: {
      campaignIds: string[];
      startDate: string;
      endDate: string;
      columns: string[];
      granularity: string;
    }
  ) {
    let queryParams: Record<string, any> = {
      campaign_ids: params.campaignIds.join(','),
      start_date: params.startDate,
      end_date: params.endDate,
      columns: params.columns.join(','),
      granularity: params.granularity
    };

    let response = await httpClient.get(`/ad_accounts/${adAccountId}/campaigns/analytics`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Ad Groups ──

  async listAdGroups(
    adAccountId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
      campaignIds?: string[];
      adGroupIds?: string[];
      entityStatuses?: string[];
      orderBy?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.campaignIds?.length) queryParams.campaign_ids = params.campaignIds.join(',');
    if (params?.adGroupIds?.length) queryParams.ad_group_ids = params.adGroupIds.join(',');
    if (params?.entityStatuses?.length)
      queryParams.entity_statuses = params.entityStatuses.join(',');
    if (params?.orderBy) queryParams.order = params.orderBy;

    let response = await httpClient.get(`/ad_accounts/${adAccountId}/ad_groups`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Ads ──

  async listAds(
    adAccountId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
      campaignIds?: string[];
      adGroupIds?: string[];
      adIds?: string[];
      entityStatuses?: string[];
      orderBy?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.campaignIds?.length) queryParams.campaign_ids = params.campaignIds.join(',');
    if (params?.adGroupIds?.length) queryParams.ad_group_ids = params.adGroupIds.join(',');
    if (params?.adIds?.length) queryParams.ad_ids = params.adIds.join(',');
    if (params?.entityStatuses?.length)
      queryParams.entity_statuses = params.entityStatuses.join(',');
    if (params?.orderBy) queryParams.order = params.orderBy;

    let response = await httpClient.get(`/ad_accounts/${adAccountId}/ads`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Conversions ──

  async sendConversionEvents(
    adAccountId: string,
    params: {
      events: Array<{
        eventName: string;
        actionSource: string;
        eventTime: number;
        eventId: string;
        eventSourceUrl?: string;
        partnerName?: string;
        userData: Record<string, any>;
        customData?: Record<string, any>;
        appId?: string;
        appName?: string;
        appVersion?: string;
        deviceBrand?: string;
        deviceModel?: string;
        osVersion?: string;
        language?: string;
      }>;
    }
  ) {
    let body = {
      data: params.events.map(event => ({
        event_name: event.eventName,
        action_source: event.actionSource,
        event_time: event.eventTime,
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        partner_name: event.partnerName,
        user_data: event.userData,
        custom_data: event.customData,
        app_id: event.appId,
        app_name: event.appName,
        app_version: event.appVersion,
        device_brand: event.deviceBrand,
        device_model: event.deviceModel,
        os_version: event.osVersion,
        language: event.language
      }))
    };

    let response = await httpClient.post(`/ad_accounts/${adAccountId}/events`, body, {
      headers: this.headers()
    });

    return response.data;
  }

  // ── Catalogs ──

  async listCatalogs(params?: { bookmark?: string; pageSize?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get('/catalogs', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async listCatalogFeeds(params?: {
    bookmark?: string;
    pageSize?: number;
    catalogId?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.catalogId) queryParams.catalog_id = params.catalogId;

    let response = await httpClient.get('/catalogs/feeds', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async getCatalogFeed(feedId: string) {
    let response = await httpClient.get(`/catalogs/feeds/${feedId}`, {
      headers: this.headers()
    });

    return response.data;
  }

  async listCatalogItems(params: { feedId: string; bookmark?: string; pageSize?: number }) {
    let queryParams: Record<string, any> = {};
    queryParams.feed_id = params.feedId;
    if (params.bookmark) queryParams.bookmark = params.bookmark;
    if (params.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get('/catalogs/items', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async listCatalogProductGroups(params?: {
    feedId?: string;
    catalogId?: string;
    bookmark?: string;
    pageSize?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.feedId) queryParams.feed_id = params.feedId;
    if (params?.catalogId) queryParams.catalog_id = params.catalogId;
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get('/catalogs/product_groups', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Trends ──

  async getTrendingTopics(params: {
    region: string;
    trendType: string;
    interests?: string[];
    genders?: string[];
    ages?: string[];
    includeKeywords?: string[];
    normalizeAgainstGroup?: boolean;
    limit?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params.interests?.length) queryParams.interests = params.interests.join(',');
    if (params.genders?.length) queryParams.genders = params.genders.join(',');
    if (params.ages?.length) queryParams.ages = params.ages.join(',');
    if (params.includeKeywords?.length)
      queryParams.include_keywords = params.includeKeywords.join(',');
    if (params.normalizeAgainstGroup !== undefined)
      queryParams.normalize_against_group = params.normalizeAgainstGroup;
    if (params.limit) queryParams.limit = params.limit;

    let response = await httpClient.get(
      `/trends/keywords/${params.region}/top/${params.trendType}`,
      {
        headers: this.headers(),
        params: queryParams
      }
    );

    return response.data;
  }

  async getRelatedTerms(terms: string[]) {
    let response = await httpClient.get('/terms/related', {
      headers: this.headers(),
      params: {
        terms: terms.join(',')
      }
    });

    return response.data;
  }

  async getSuggestedTerms(term: string, limit?: number) {
    let queryParams: Record<string, any> = {
      term
    };
    if (limit) queryParams.limit = limit;

    let response = await httpClient.get('/terms/suggested', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Search ──

  async searchPins(params: {
    query: string;
    bookmark?: string;
    pageSize?: number;
    adAccountId?: string;
  }) {
    let queryParams: Record<string, any> = {
      query: params.query
    };
    if (params.bookmark) queryParams.bookmark = params.bookmark;
    if (params.pageSize) queryParams.page_size = params.pageSize;
    if (params.adAccountId) queryParams.ad_account_id = params.adAccountId;

    let response = await httpClient.get('/search/pins', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async searchBoards(params: { query: string; bookmark?: string; pageSize?: number }) {
    let queryParams: Record<string, any> = {
      query: params.query
    };
    if (params.bookmark) queryParams.bookmark = params.bookmark;
    if (params.pageSize) queryParams.page_size = params.pageSize;

    let response = await httpClient.get('/search/boards', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ── Audiences ──

  async listAudiences(
    adAccountId: string,
    params?: {
      bookmark?: string;
      pageSize?: number;
      orderBy?: string;
      entityStatuses?: string[];
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.bookmark) queryParams.bookmark = params.bookmark;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.orderBy) queryParams.order = params.orderBy;
    if (params?.entityStatuses?.length)
      queryParams.entity_statuses = params.entityStatuses.join(',');

    let response = await httpClient.get(`/ad_accounts/${adAccountId}/audiences`, {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async createAudience(
    adAccountId: string,
    params: {
      name: string;
      rule: Record<string, any>;
      description?: string;
      audienceType: string;
    }
  ) {
    let body: Record<string, any> = {
      name: params.name,
      rule: params.rule,
      audience_type: params.audienceType
    };
    if (params.description) body.description = params.description;

    let response = await httpClient.post(`/ad_accounts/${adAccountId}/audiences`, body, {
      headers: this.headers()
    });

    return response.data;
  }
}
