import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface SocialSet {
  id: string;
  username: string;
  name: string;
  profile_image_url: string | null;
  team: {
    id: string;
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
  tags?: string[];
  share?: boolean;
  draftTitle?: string;
}

export interface Draft {
  id: string;
  social_set_id: string;
  status: string;
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

export interface ListDraftsParams {
  socialSetId: string;
  status?: string;
  tag?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface Tag {
  id: string;
  name: string;
}

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
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.typefully.com/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Social Sets

  async listSocialSets(): Promise<PaginatedResponse<SocialSet>> {
    let response = await this.http.get('/social-sets');
    return response.data;
  }

  async getSocialSet(socialSetId: string): Promise<SocialSet> {
    let response = await this.http.get(`/social-sets/${socialSetId}`);
    return response.data;
  }

  // Drafts

  async createDraft(socialSetId: string, params: CreateDraftParams): Promise<Draft> {
    let body: Record<string, unknown> = {
      platforms: params.platforms
    };

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

  async getDraft(socialSetId: string, draftId: string): Promise<Draft> {
    let response = await this.http.get(`/social-sets/${socialSetId}/drafts/${draftId}`);
    return response.data;
  }

  async listDrafts(params: ListDraftsParams): Promise<PaginatedResponse<Draft>> {
    let queryParams: Record<string, string | number> = {};
    if (params.status) queryParams.status = params.status;
    if (params.tag) queryParams.tag = params.tag;
    if (params.sort) queryParams.sort = params.sort;
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

  async listTags(socialSetId: string): Promise<PaginatedResponse<Tag>> {
    let response = await this.http.get(`/social-sets/${socialSetId}/tags`);
    return response.data;
  }

  async createTag(socialSetId: string, name: string): Promise<Tag> {
    let response = await this.http.post(`/social-sets/${socialSetId}/tags`, { name });
    return response.data;
  }

  // Media

  async initiateMediaUpload(
    socialSetId: string,
    fileName: string
  ): Promise<MediaUploadResponse> {
    let response = await this.http.post(`/social-sets/${socialSetId}/media/upload`, {
      file_name: fileName
    });
    return response.data;
  }

  async getMediaStatus(socialSetId: string, mediaId: string): Promise<MediaStatus> {
    let response = await this.http.get(`/social-sets/${socialSetId}/media/${mediaId}`);
    return response.data;
  }

  // Queue

  async getQueueSchedule(socialSetId: string): Promise<unknown> {
    let response = await this.http.get(`/social-sets/${socialSetId}/queue/schedule`);
    return response.data;
  }

  async getQueue(socialSetId: string): Promise<unknown> {
    let response = await this.http.get(`/social-sets/${socialSetId}/queue`);
    return response.data;
  }
}
