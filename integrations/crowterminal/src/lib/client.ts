import { createAxios } from 'slates';
import type {
  Account,
  CreatePostParams,
  CreateScheduleSlotParams,
  ListPostsParams,
  PaginatedResponse,
  Post,
  PostJob,
  ScheduleSlot,
  UpdatePostParams
} from './types';

let DEFAULT_BASE_URL = 'https://api.crowterminal.com/v1';

export class CrowTerminalClient {
  private http;

  constructor(config: { token: string; baseUrl?: string }) {
    this.http = createAxios({
      baseURL: config.baseUrl || DEFAULT_BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Posts ---

  async createPost(params: CreatePostParams): Promise<Post> {
    let response = await this.http.post('/posts', {
      platform: params.platform,
      account_id: params.accountId,
      text: params.text,
      media_urls: params.mediaUrls || [],
      scheduled_at: params.scheduledAt || null,
      idempotency_key: params.idempotencyKey || null
    });
    return mapPost(response.data);
  }

  async getPost(postId: string): Promise<Post> {
    let response = await this.http.get(`/posts/${postId}`);
    return mapPost(response.data);
  }

  async listPosts(params?: ListPostsParams): Promise<PaginatedResponse<Post>> {
    let query: Record<string, string | number> = {};
    if (params?.platform) query.platform = params.platform;
    if (params?.accountId) query.account_id = params.accountId;
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let response = await this.http.get('/posts', { params: query });
    return {
      items: (response.data.items || []).map(mapPost),
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset
    };
  }

  async updatePost(postId: string, params: UpdatePostParams): Promise<Post> {
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.mediaUrls !== undefined) body.media_urls = params.mediaUrls;
    if (params.scheduledAt !== undefined) body.scheduled_at = params.scheduledAt;

    let response = await this.http.patch(`/posts/${postId}`, body);
    return mapPost(response.data);
  }

  async deletePost(postId: string): Promise<void> {
    await this.http.delete(`/posts/${postId}`);
  }

  async getPostJob(postId: string): Promise<PostJob> {
    let response = await this.http.get(`/posts/${postId}/job`);
    return mapPostJob(response.data);
  }

  // --- Accounts ---

  async listAccounts(): Promise<Account[]> {
    let response = await this.http.get('/accounts');
    return (response.data.items || response.data || []).map(mapAccount);
  }

  async getAccount(accountId: string): Promise<Account> {
    let response = await this.http.get(`/accounts/${accountId}`);
    return mapAccount(response.data);
  }

  // --- Schedule ---

  async listScheduleSlots(accountId?: string): Promise<ScheduleSlot[]> {
    let query: Record<string, string> = {};
    if (accountId) query.account_id = accountId;

    let response = await this.http.get('/schedule/slots', { params: query });
    return (response.data.items || response.data || []).map(mapScheduleSlot);
  }

  async createScheduleSlot(params: CreateScheduleSlotParams): Promise<ScheduleSlot> {
    let response = await this.http.post('/schedule/slots', {
      day_of_week: params.dayOfWeek,
      time: params.time,
      platform: params.platform,
      account_id: params.accountId
    });
    return mapScheduleSlot(response.data);
  }

  async deleteScheduleSlot(slotId: string): Promise<void> {
    await this.http.delete(`/schedule/slots/${slotId}`);
  }

  async toggleScheduleSlot(slotId: string, enabled: boolean): Promise<ScheduleSlot> {
    let response = await this.http.patch(`/schedule/slots/${slotId}`, { enabled });
    return mapScheduleSlot(response.data);
  }
}

// --- Mappers (snake_case API -> camelCase) ---

let mapPost = (data: Record<string, unknown>): Post => ({
  postId: String(data.post_id || data.id || ''),
  platform: String(data.platform || '') as Post['platform'],
  text: String(data.text || ''),
  mediaUrls: (data.media_urls as string[]) || [],
  status: String(data.status || 'queued') as Post['status'],
  scheduledAt: (data.scheduled_at as string) || null,
  publishedAt: (data.published_at as string) || null,
  createdAt: String(data.created_at || ''),
  updatedAt: String(data.updated_at || ''),
  failureReason: (data.failure_reason as string) || null,
  platformPostId: (data.platform_post_id as string) || null,
  platformPostUrl: (data.platform_post_url as string) || null,
  accountId: String(data.account_id || '')
});

let mapAccount = (data: Record<string, unknown>): Account => ({
  accountId: String(data.account_id || data.id || ''),
  platform: String(data.platform || '') as Account['platform'],
  username: String(data.username || ''),
  displayName: String(data.display_name || ''),
  connected: Boolean(data.connected),
  createdAt: String(data.created_at || '')
});

let mapScheduleSlot = (data: Record<string, unknown>): ScheduleSlot => ({
  slotId: String(data.slot_id || data.id || ''),
  dayOfWeek: String(data.day_of_week || ''),
  time: String(data.time || ''),
  platform: String(data.platform || '') as ScheduleSlot['platform'],
  accountId: String(data.account_id || ''),
  enabled: Boolean(data.enabled)
});

let mapPostJob = (data: Record<string, unknown>): PostJob => ({
  jobId: String(data.job_id || data.id || ''),
  postId: String(data.post_id || ''),
  status: String(data.status || '') as PostJob['status'],
  createdAt: String(data.created_at || ''),
  completedAt: (data.completed_at as string) || null,
  failureReason: (data.failure_reason as string) || null
});
