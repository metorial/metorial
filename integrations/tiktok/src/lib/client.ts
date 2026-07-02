import { createAxios } from '@slates/provider';
import { assertBusinessSuccess, assertConsumerSuccess, tiktokApiError } from './errors';

export class TikTokConsumerClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://open.tiktokapis.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async requestData<T>(
    operation: string,
    request: () => Promise<{ data: unknown }>
  ): Promise<T> {
    try {
      let response = await request();
      assertConsumerSuccess(response.data, operation);
      return ((response.data as { data?: T }).data ?? ({} as T)) as T;
    } catch (error) {
      throw tiktokApiError(error, operation);
    }
  }

  // ── User ──

  async getUserInfo(fields: string[]): Promise<TikTokUser> {
    let data = await this.requestData<{ user?: TikTokUser }>('get user info', () =>
      this.axios.get(`/user/info/?fields=${fields.join(',')}`)
    );
    return data.user ?? {};
  }

  // ── Videos ──

  async listVideos(params: {
    fields: string[];
    cursor?: number;
    maxCount?: number;
  }): Promise<{ videos: TikTokVideo[]; cursor: number; hasMore: boolean }> {
    let data = await this.requestData<{
      videos?: TikTokVideo[];
      cursor?: number;
      has_more?: boolean;
    }>('list videos', () =>
      this.axios.post(`/video/list/?fields=${params.fields.join(',')}`, {
        cursor: params.cursor,
        max_count: params.maxCount ?? 20
      })
    );
    return {
      videos: data.videos ?? [],
      cursor: data.cursor ?? 0,
      hasMore: data.has_more ?? false
    };
  }

  async queryVideos(params: { videoIds: string[]; fields: string[] }): Promise<TikTokVideo[]> {
    let data = await this.requestData<{ videos?: TikTokVideo[] }>('query videos', () =>
      this.axios.post(`/video/query/?fields=${params.fields.join(',')}`, {
        filters: {
          video_ids: params.videoIds
        }
      })
    );
    return data.videos ?? [];
  }

  // ── Content Posting ──

  async queryCreatorInfo(): Promise<TikTokCreatorInfo> {
    return this.requestData<TikTokCreatorInfo>('query creator info', () =>
      this.axios.post('/post/publish/creator_info/query/', {})
    );
  }

  async initVideoPost(params: {
    postInfo: {
      privacyLevel: string;
      title?: string;
      disableDuet?: boolean;
      disableStitch?: boolean;
      disableComment?: boolean;
      videoCoverTimestampMs?: number;
      brandContentToggle?: boolean;
      brandOrganicToggle?: boolean;
      isAigc?: boolean;
    };
    sourceInfo: {
      source: 'PULL_FROM_URL' | 'FILE_UPLOAD';
      videoUrl?: string;
      videoSize?: number;
      chunkSize?: number;
      totalChunkCount?: number;
    };
  }): Promise<{ publishId: string; uploadUrl?: string }> {
    let data = await this.requestData<{
      publish_id?: string;
      upload_url?: string;
    }>('initialize video post', () =>
      this.axios.post('/post/publish/video/init/', {
        post_info: {
          privacy_level: params.postInfo.privacyLevel,
          title: params.postInfo.title,
          disable_duet: params.postInfo.disableDuet,
          disable_stitch: params.postInfo.disableStitch,
          disable_comment: params.postInfo.disableComment,
          video_cover_timestamp_ms: params.postInfo.videoCoverTimestampMs,
          brand_content_toggle: params.postInfo.brandContentToggle,
          brand_organic_toggle: params.postInfo.brandOrganicToggle,
          is_aigc: params.postInfo.isAigc
        },
        source_info: {
          source: params.sourceInfo.source,
          video_url: params.sourceInfo.videoUrl,
          video_size: params.sourceInfo.videoSize,
          chunk_size: params.sourceInfo.chunkSize,
          total_chunk_count: params.sourceInfo.totalChunkCount
        }
      })
    );
    return {
      publishId: data.publish_id ?? '',
      uploadUrl: data.upload_url
    };
  }

  async initPhotoPost(params: {
    postInfo: {
      privacyLevel: string;
      title?: string;
      description?: string;
      disableComment?: boolean;
      autoAddMusic?: boolean;
      brandContentToggle?: boolean;
      brandOrganicToggle?: boolean;
      isAigc?: boolean;
    };
    sourceInfo: {
      source: 'PULL_FROM_URL';
      photoImages: string[];
      photoCoverIndex?: number;
    };
  }): Promise<{ publishId: string }> {
    let data = await this.requestData<{ publish_id?: string }>('initialize photo post', () =>
      this.axios.post('/post/publish/content/init/', {
        post_info: {
          privacy_level: params.postInfo.privacyLevel,
          title: params.postInfo.title,
          description: params.postInfo.description,
          disable_comment: params.postInfo.disableComment,
          auto_add_music: params.postInfo.autoAddMusic,
          brand_content_toggle: params.postInfo.brandContentToggle,
          brand_organic_toggle: params.postInfo.brandOrganicToggle,
          is_aigc: params.postInfo.isAigc
        },
        source_info: {
          source: params.sourceInfo.source,
          photo_images: params.sourceInfo.photoImages,
          photo_cover_index: params.sourceInfo.photoCoverIndex ?? 0
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO'
      })
    );
    return {
      publishId: data.publish_id ?? ''
    };
  }

  async getPublishStatus(publishId: string): Promise<TikTokPublishStatus> {
    return this.requestData<TikTokPublishStatus>('get publish status', () =>
      this.axios.post('/post/publish/status/fetch/', {
        publish_id: publishId
      })
    );
  }
}

export class TikTokBusinessClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://business-api.tiktok.com/open_api/v1.3',
      headers: {
        'Access-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private async requestData<T>(
    operation: string,
    request: () => Promise<{ data: unknown }>
  ): Promise<T> {
    try {
      let response = await request();
      assertBusinessSuccess(response.data, operation);
      return ((response.data as { data?: T }).data ?? ({} as T)) as T;
    } catch (error) {
      throw tiktokApiError(error, operation);
    }
  }

  // ── Advertisers ──

  async listAdvertisers(params: {
    appId: string;
    secret: string;
  }): Promise<TikTokAdvertiser[]> {
    let data = await this.requestData<{ list?: Record<string, unknown>[] }>(
      'list authorized advertisers',
      () =>
        this.axios.get('/oauth2/advertiser/get/', {
          params: {
            app_id: params.appId,
            secret: params.secret
          }
        })
    );

    return (data.list ?? []).map(mapAdvertiser);
  }

  // ── Campaigns ──

  async getCampaigns(params: {
    advertiserId: string;
    campaignIds?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<{ campaigns: TikTokCampaign[]; pageInfo: TikTokPageInfo }> {
    let filtering: Record<string, unknown> = {};
    if (params.campaignIds?.length) {
      filtering.campaign_ids = params.campaignIds;
    }
    let data = await this.requestData<{
      list?: Record<string, any>[];
      page_info?: Record<string, any>;
    }>('get campaigns', () =>
      this.axios.get('/campaign/get/', {
        params: {
          advertiser_id: params.advertiserId,
          filtering: JSON.stringify(filtering),
          page: params.page ?? 1,
          page_size: params.pageSize ?? 20
        }
      })
    );
    return {
      campaigns: (data.list ?? []).map(mapCampaign),
      pageInfo: mapPageInfo(data.page_info)
    };
  }

  async createCampaign(params: {
    advertiserId: string;
    campaignName: string;
    objectiveType: string;
    budgetMode?: string;
    budget?: number;
    operationStatus?: string;
    campaignType?: string;
    budgetOptimizeOn?: boolean;
  }): Promise<{ campaignId: string }> {
    let data = await this.requestData<{ campaign_id?: string }>('create campaign', () =>
      this.axios.post('/campaign/create/', {
        advertiser_id: params.advertiserId,
        campaign_name: params.campaignName,
        objective_type: params.objectiveType,
        budget_mode: params.budgetMode,
        budget: params.budget,
        operation_status: params.operationStatus,
        campaign_type: params.campaignType,
        budget_optimize_on: params.budgetOptimizeOn
      })
    );
    return { campaignId: data.campaign_id ?? '' };
  }

  async updateCampaign(params: {
    advertiserId: string;
    campaignId: string;
    campaignName?: string;
    budget?: number;
    budgetMode?: string;
    operationStatus?: string;
  }): Promise<{ campaignId: string }> {
    let data = await this.requestData<{ campaign_id?: string }>('update campaign', () =>
      this.axios.post('/campaign/update/', {
        advertiser_id: params.advertiserId,
        campaign_id: params.campaignId,
        campaign_name: params.campaignName,
        budget: params.budget,
        budget_mode: params.budgetMode,
        operation_status: params.operationStatus
      })
    );
    return { campaignId: data.campaign_id ?? '' };
  }

  async updateCampaignStatus(params: {
    advertiserId: string;
    campaignIds: string[];
    operationStatus: string;
  }): Promise<{ campaignIds: string[] }> {
    let data = await this.requestData<{ campaign_ids?: string[] }>(
      'update campaign status',
      () =>
        this.axios.post('/campaign/status/update/', {
          advertiser_id: params.advertiserId,
          campaign_ids: params.campaignIds,
          opt_status: params.operationStatus
        })
    );
    return { campaignIds: data.campaign_ids ?? [] };
  }

  // ── Ad Groups ──

  async getAdGroups(params: {
    advertiserId: string;
    campaignIds?: string[];
    adGroupIds?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<{ adGroups: TikTokAdGroup[]; pageInfo: TikTokPageInfo }> {
    let filtering: Record<string, unknown> = {};
    if (params.campaignIds?.length) {
      filtering.campaign_ids = params.campaignIds;
    }
    if (params.adGroupIds?.length) {
      filtering.adgroup_ids = params.adGroupIds;
    }
    let data = await this.requestData<{
      list?: Record<string, any>[];
      page_info?: Record<string, any>;
    }>('get ad groups', () =>
      this.axios.get('/adgroup/get/', {
        params: {
          advertiser_id: params.advertiserId,
          filtering: JSON.stringify(filtering),
          page: params.page ?? 1,
          page_size: params.pageSize ?? 20
        }
      })
    );
    return {
      adGroups: (data.list ?? []).map(mapAdGroup),
      pageInfo: mapPageInfo(data.page_info)
    };
  }

  async createAdGroup(params: {
    advertiserId: string;
    campaignId: string;
    adGroupName: string;
    placementType?: string;
    placement?: string[];
    budget?: number;
    budgetMode?: string;
    scheduleType?: string;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    optimizeGoal?: string;
    billingEvent?: string;
    bidType?: string;
    bid?: number;
    pacing?: string;
    location?: string[];
    gender?: string;
    age?: string[];
  }): Promise<{ adGroupId: string }> {
    let data = await this.requestData<{ adgroup_id?: string }>('create ad group', () =>
      this.axios.post('/adgroup/create/', {
        advertiser_id: params.advertiserId,
        campaign_id: params.campaignId,
        adgroup_name: params.adGroupName,
        placement_type: params.placementType,
        placement: params.placement,
        budget: params.budget,
        budget_mode: params.budgetMode,
        schedule_type: params.scheduleType,
        schedule_start_time: params.scheduleStartTime,
        schedule_end_time: params.scheduleEndTime,
        optimize_goal: params.optimizeGoal,
        billing_event: params.billingEvent,
        bid_type: params.bidType,
        bid: params.bid,
        pacing: params.pacing,
        location: params.location,
        gender: params.gender,
        age: params.age
      })
    );
    return { adGroupId: data.adgroup_id ?? '' };
  }

  // ── Ads ──

  async getAds(params: {
    advertiserId: string;
    adGroupIds?: string[];
    adIds?: string[];
    campaignIds?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<{ ads: TikTokAd[]; pageInfo: TikTokPageInfo }> {
    let filtering: Record<string, unknown> = {};
    if (params.adGroupIds?.length) {
      filtering.adgroup_ids = params.adGroupIds;
    }
    if (params.adIds?.length) {
      filtering.ad_ids = params.adIds;
    }
    if (params.campaignIds?.length) {
      filtering.campaign_ids = params.campaignIds;
    }
    let data = await this.requestData<{
      list?: Record<string, any>[];
      page_info?: Record<string, any>;
    }>('get ads', () =>
      this.axios.get('/ad/get/', {
        params: {
          advertiser_id: params.advertiserId,
          filtering: JSON.stringify(filtering),
          page: params.page ?? 1,
          page_size: params.pageSize ?? 20
        }
      })
    );
    return {
      ads: (data.list ?? []).map(mapAd),
      pageInfo: mapPageInfo(data.page_info)
    };
  }

  // ── Reports ──

  async getReport(params: {
    advertiserId: string;
    reportType: string;
    dimensions: string[];
    metrics: string[];
    dataLevel: string;
    startDate: string;
    endDate: string;
    page?: number;
    pageSize?: number;
    filters?: Array<{ fieldName: string; filterType: string; filterValue: string }>;
  }): Promise<{ rows: Record<string, unknown>[]; pageInfo: TikTokPageInfo }> {
    let data = await this.requestData<{
      list?: Record<string, unknown>[];
      page_info?: Record<string, any>;
    }>('get report', () =>
      this.axios.get('/report/integrated/get/', {
        params: {
          advertiser_id: params.advertiserId,
          report_type: params.reportType,
          dimensions: JSON.stringify(params.dimensions),
          metrics: JSON.stringify(params.metrics),
          data_level: params.dataLevel,
          start_date: params.startDate,
          end_date: params.endDate,
          page: params.page ?? 1,
          page_size: params.pageSize ?? 20,
          filtering: params.filters ? JSON.stringify(params.filters) : undefined
        }
      })
    );
    return {
      rows: data.list ?? [],
      pageInfo: mapPageInfo(data.page_info)
    };
  }
}

// ── Types ──

export interface TikTokUser {
  open_id?: string;
  union_id?: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokVideo {
  id?: string;
  create_time?: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  height?: number;
  width?: number;
  title?: string;
  embed_html?: string;
  embed_link?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

export interface TikTokCreatorInfo {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

export interface TikTokPublishStatus {
  status?: string;
  publish_status?: number;
  fail_reason?: string;
  publicaly_available_post_id?: string[];
}

export interface TikTokAdvertiser {
  advertiserId: string;
  advertiserName?: string;
  advertiserRole?: string;
  isValid?: boolean;
  accountRole?: string;
}

export interface TikTokCampaign {
  campaignId: string;
  campaignName: string;
  objectiveType: string;
  budget: number;
  budgetMode: string;
  operationStatus: string;
  campaignType: string;
  createTime: string;
  modifyTime: string;
}

export interface TikTokAdGroup {
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  operationStatus: string;
  budget: number;
  budgetMode: string;
  optimizeGoal: string;
  billingEvent: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
}

export interface TikTokAd {
  adId: string;
  adGroupId: string;
  campaignId: string;
  adName: string;
  operationStatus: string;
  createTime: string;
  modifyTime: string;
}

export interface TikTokPageInfo {
  page: number;
  pageSize: number;
  totalNumber: number;
  totalPage: number;
}

// ── Mappers ──

let mapAdvertiser = (raw: Record<string, unknown>): TikTokAdvertiser => ({
  advertiserId: raw.advertiser_id !== undefined ? String(raw.advertiser_id) : '',
  advertiserName: typeof raw.advertiser_name === 'string' ? raw.advertiser_name : undefined,
  advertiserRole: raw.advertiser_role !== undefined ? String(raw.advertiser_role) : undefined,
  isValid:
    typeof raw.is_valid === 'boolean'
      ? raw.is_valid
      : typeof raw.is_valid === 'number'
        ? raw.is_valid === 1
        : undefined,
  accountRole: raw.account_role !== undefined ? String(raw.account_role) : undefined
});

let mapCampaign = (raw: Record<string, any>): TikTokCampaign => ({
  campaignId: raw.campaign_id ?? '',
  campaignName: raw.campaign_name ?? '',
  objectiveType: raw.objective_type ?? '',
  budget: raw.budget ?? 0,
  budgetMode: raw.budget_mode ?? '',
  operationStatus: raw.operation_status ?? raw.opt_status ?? '',
  campaignType: raw.campaign_type ?? '',
  createTime: raw.create_time ?? '',
  modifyTime: raw.modify_time ?? ''
});

let mapAdGroup = (raw: Record<string, any>): TikTokAdGroup => ({
  adGroupId: raw.adgroup_id ?? '',
  adGroupName: raw.adgroup_name ?? '',
  campaignId: raw.campaign_id ?? '',
  operationStatus: raw.operation_status ?? raw.opt_status ?? '',
  budget: raw.budget ?? 0,
  budgetMode: raw.budget_mode ?? '',
  optimizeGoal: raw.optimize_goal ?? '',
  billingEvent: raw.billing_event ?? '',
  scheduleStartTime: raw.schedule_start_time ?? '',
  scheduleEndTime: raw.schedule_end_time ?? ''
});

let mapAd = (raw: Record<string, any>): TikTokAd => ({
  adId: raw.ad_id ?? '',
  adGroupId: raw.adgroup_id ?? '',
  campaignId: raw.campaign_id ?? '',
  adName: raw.ad_name ?? '',
  operationStatus: raw.operation_status ?? raw.opt_status ?? '',
  createTime: raw.create_time ?? '',
  modifyTime: raw.modify_time ?? ''
});

let mapPageInfo = (raw?: Record<string, any>): TikTokPageInfo => ({
  page: raw?.page ?? 1,
  pageSize: raw?.page_size ?? 20,
  totalNumber: raw?.total_number ?? 0,
  totalPage: raw?.total_page ?? 0
});
