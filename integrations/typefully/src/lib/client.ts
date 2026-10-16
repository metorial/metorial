import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface SocialSet {
  id: string | number;
  username: string;
  name: string;
  profile_image_url: string | null;
  team: {
    id: string | number;
    name: string;
  } | null;
}

export interface PlatformPost {
  text: string;
  media_ids?: string[];
  quote_post_url?: string;
}

export interface PlatformConfig {
  enabled: boolean;
  posts: PlatformPost[];
  settings?: Record<string, unknown>;
}

export interface DraftPlatforms {
  x?: PlatformConfig;
  linkedin?: PlatformConfig;
  threads?: PlatformConfig;
  bluesky?: PlatformConfig;
  mastodon?: PlatformConfig;
}

export interface CreateDraftParams {
  platforms: DraftPlatforms;
  publishAt?: string;
  planAt?: string | null;
  forceOverwriteComments?: boolean;
  tags?: string[];
  share?: boolean;
  draftTitle?: string;
}

export interface Draft {
  id: string | number;
  social_set_id: string | number;
  status: string;
  publish_state?: string | null;
  created_at: string;
  updated_at: string;
  scheduled_date: string | null;
  published_at: string | null;
  draft_title: string | null;
  tags: string[];
  preview: string | null;
  share_url: string | null;
  private_url: string | null;
  x_post_enabled: boolean;
  linkedin_post_enabled: boolean;
  threads_post_enabled: boolean;
  bluesky_post_enabled: boolean;
  mastodon_post_enabled: boolean;
  x_published_url: string | null;
  linkedin_published_url: string | null;
  threads_published_url: string | null;
  bluesky_published_url: string | null;
  mastodon_published_url: string | null;
  x_published_at: string | null;
  linkedin_published_at: string | null;
  threads_published_at: string | null;
  bluesky_published_at: string | null;
  mastodon_published_at: string | null;
  platforms: DraftPlatforms;
}

export let draftOrderByValues = [
  'created_at',
  '-created_at',
  'updated_at',
  '-updated_at',
  'scheduled_date',
  '-scheduled_date',
  'published_at',
  '-published_at'
] as const;

export interface ListDraftsParams {
  socialSetId: string;
  status?: string;
  tag?: string;
  sort?: string;
  orderBy?: (typeof draftOrderByValues)[number];
  limit?: number;
  offset?: number;
}

export interface Tag {
  id?: string;
  slug: string;
  name: string;
  created_at?: string;
}

export interface CurrentUser {
  id: string | number;
  name?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
  signup_date?: string | null;
  api_key_label?: string | null;
}

export let providerId = (value: string | number): string => {
  if (
    (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return String(value);
  throw createApiServiceError('Typefully returned an invalid resource identifier.');
};

export let tagIdentifier = (tag: Tag): string => providerId(tag.id ?? tag.slug);

export let enabledDraftPlatforms = (draft: Draft): string[] =>
  ['x', 'linkedin', 'threads', 'bluesky', 'mastodon'].filter(platform => {
    let configured = draft.platforms?.[platform as keyof DraftPlatforms];
    return configured
      ? configured.enabled
      : draft[`${platform}_post_enabled` as keyof Draft] === true;
  });

export let validatePagination = (params: { limit?: number; offset?: number }) => {
  if (params.limit !== undefined && !Number.isInteger(params.limit)) {
    throw createApiServiceError('limit must be a whole number.');
  }
  if (params.offset !== undefined && !Number.isInteger(params.offset)) {
    throw createApiServiceError('offset must be a whole number.');
  }
};

export interface MediaUploadResponse {
  media_id: string;
  upload_url: string;
}

export interface MediaStatus {
  media_id: string;
  status: string;
  media_urls?: {
    original: string;
  };
}

export interface QueueSlot {
  time: string;
  draft_id: string | null;
}

export class TypefullyClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError('A Typefully API key is required. Reconnect your account.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.typefully.com/v2',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Typefully',
          reason: 'typefully_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          nestedKeys: ['error', 'details', 'errors'],
          extractUpstreamCode: (_error, response) => {
            if (!isApiErrorRecord(response?.data) || !isApiErrorRecord(response.data.error))
              return undefined;
            return typeof response.data.error.code === 'string'
              ? response.data.error.code
              : undefined;
          }
        })
    });
  }

  async getCurrentUser(): Promise<CurrentUser> {
    return (await this.http.get('/me')).data;
  }

  // Social Sets

  async listSocialSets(
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<SocialSet>> {
    validatePagination(params);
    let response = await this.http.get('/social-sets', { params });
    return response.data;
  }

  async getSocialSet(socialSetId: string): Promise<SocialSet & Record<string, unknown>> {
    let response = await this.http.get(`/social-sets/${socialSetId}`);
    return response.data;
  }

  // Drafts

  async createDraft(socialSetId: string, params: CreateDraftParams): Promise<Draft> {
    let body: Record<string, unknown> = {
      platforms: params.platforms
    };

    if (params.publishAt !== undefined && params.planAt !== undefined) {
      throw createApiServiceError('publishAt and planAt cannot be supplied together.');
    }
    if (params.planAt === 'now') {
      throw createApiServiceError(
        'planAt does not accept now. Use a future datetime or next-free-slot.'
      );
    }
    if (params.planAt !== undefined) body.plan_at = params.planAt;
    if (params.forceOverwriteComments !== undefined)
      body.force_overwrite_comments = params.forceOverwriteComments;
    if (params.publishAt !== undefined) {
      body.publish_at = params.publishAt;
    }
    if (params.tags !== undefined) {
      body.tags = params.tags;
    }
    if (params.share !== undefined) {
      body.share = params.share;
    }
    if (params.draftTitle !== undefined) {
      body.draft_title = params.draftTitle;
    }

    let response = await this.http.post(`/social-sets/${socialSetId}/drafts`, body);
    return response.data;
  }

  async getDraft(
    socialSetId: string,
    draftId: string,
    excludeCommentMarkers?: boolean
  ): Promise<Draft> {
    let response = await this.http.get(`/social-sets/${socialSetId}/drafts/${draftId}`, {
      params:
        excludeCommentMarkers === undefined
          ? undefined
          : { exclude_comment_markers: excludeCommentMarkers }
    });
    return response.data;
  }

  async listDrafts(params: ListDraftsParams): Promise<PaginatedResponse<Draft>> {
    validatePagination(params);
    if (params.sort !== undefined && params.orderBy !== undefined) {
      throw createApiServiceError(
        'Choose either orderBy or the legacy sort field, not both. Prefer orderBy for documented draft ordering.'
      );
    }
    let queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.tag) queryParams.tag = params.tag;
    if (params.sort) queryParams.sort = params.sort;
    if (params.orderBy !== undefined) queryParams.order_by = params.orderBy;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;

    let response = await this.http.get(`/social-sets/${params.socialSetId}/drafts`, {
      params: queryParams
    });
    return response.data;
  }

  async updateDraft(
    socialSetId: string,
    draftId: string,
    params: Partial<CreateDraftParams>
  ): Promise<Draft> {
    let body: Record<string, unknown> = {};

    if (params.platforms !== undefined) {
      body.platforms = params.platforms;
    }
    if (params.publishAt !== undefined && params.planAt !== undefined) {
      throw createApiServiceError('publishAt and planAt cannot be supplied together.');
    }
    if (params.planAt === 'now') {
      throw createApiServiceError(
        'planAt does not accept now. Use a future datetime or next-free-slot.'
      );
    }
    if (params.planAt !== undefined) body.plan_at = params.planAt;
    if (params.forceOverwriteComments !== undefined)
      body.force_overwrite_comments = params.forceOverwriteComments;
    if (params.publishAt !== undefined) {
      body.publish_at = params.publishAt;
    }
    if (params.tags !== undefined) {
      body.tags = params.tags;
    }
    if (params.share !== undefined) {
      body.share = params.share;
    }
    if (params.draftTitle !== undefined) {
      body.draft_title = params.draftTitle;
    }

    let response = await this.http.patch(
      `/social-sets/${socialSetId}/drafts/${draftId}`,
      body
    );
    return response.data;
  }

  async deleteDraft(socialSetId: string, draftId: string): Promise<void> {
    await this.http.delete(`/social-sets/${socialSetId}/drafts/${draftId}`);
  }

  // Tags

  async listTags(
    socialSetId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Tag>> {
    validatePagination(params);
    let response = await this.http.get(`/social-sets/${socialSetId}/tags`, { params });
    return response.data;
  }

  async createTag(socialSetId: string, name: string): Promise<Tag> {
    let response = await this.http.post(`/social-sets/${socialSetId}/tags`, { name });
    return response.data;
  }

  // Media

  async initiateMediaUpload(
    socialSetId: string,
    fileName: string,
    altText?: string | null
  ): Promise<MediaUploadResponse> {
    let response = await this.http.post(`/social-sets/${socialSetId}/media/upload`, {
      file_name: fileName,
      ...(altText !== undefined ? { alt_text: altText } : {})
    });
    return response.data;
  }

  async getMediaStatus(socialSetId: string, mediaId: string): Promise<MediaStatus> {
    let response = await this.http.get(`/social-sets/${socialSetId}/media/${mediaId}`);
    return response.data;
  }

  async updateMedia(
    socialSetId: string,
    mediaId: string,
    altText: string | null
  ): Promise<Record<string, unknown>> {
    return (
      await this.http.patch(`/social-sets/${socialSetId}/media/${mediaId}`, {
        alt_text: altText
      })
    ).data;
  }

  async getQueueSchedule(socialSetId: string): Promise<Record<string, unknown>> {
    return (await this.http.get(`/social-sets/${socialSetId}/queue/schedule`)).data;
  }

  async replaceQueueSchedule(
    socialSetId: string,
    rules: { h: number; m: number; days: string[] }[]
  ): Promise<Record<string, unknown>> {
    return (await this.http.put(`/social-sets/${socialSetId}/queue/schedule`, { rules })).data;
  }

  async getQueue(
    socialSetId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>> {
    return (
      await this.http.get(`/social-sets/${socialSetId}/queue`, {
        params: { start_date: startDate, end_date: endDate }
      })
    ).data;
  }

  async listCommentThreads(
    socialSetId: string,
    draftId: string,
    params: { status?: string; platform?: string; limit?: number; offset?: number }
  ): Promise<Record<string, unknown>> {
    validatePagination(params);
    return (
      await this.http.get(`/social-sets/${socialSetId}/drafts/${draftId}/comment-threads`, {
        params
      })
    ).data;
  }

  async createCommentThread(
    socialSetId: string,
    draftId: string,
    params: {
      platform: string;
      post_index?: number;
      selected_text: string;
      occurrence?: number;
      text: string;
    }
  ): Promise<Record<string, unknown>> {
    return (
      await this.http.post(
        `/social-sets/${socialSetId}/drafts/${draftId}/comment-threads`,
        params
      )
    ).data;
  }

  async replyToCommentThread(
    socialSetId: string,
    draftId: string,
    commentThreadId: string,
    text: string
  ): Promise<Record<string, unknown>> {
    return (
      await this.http.post(
        `/social-sets/${socialSetId}/drafts/${draftId}/comment-threads/${commentThreadId}/comments`,
        { text }
      )
    ).data;
  }

  async resolveCommentThread(
    socialSetId: string,
    draftId: string,
    commentThreadId: string
  ): Promise<Record<string, unknown>> {
    return (
      await this.http.post(
        `/social-sets/${socialSetId}/drafts/${draftId}/comment-threads/${commentThreadId}/resolve`
      )
    ).data;
  }
}
