export type Platform = 'tiktok' | 'x' | 'instagram';

export type PostStatus = 'queued' | 'processing' | 'published' | 'failed' | 'scheduled';

export interface Post {
  postId: string;
  platform: Platform;
  text: string;
  mediaUrls: string[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  failureReason: string | null;
  platformPostId: string | null;
  platformPostUrl: string | null;
  accountId: string;
}

export interface Account {
  accountId: string;
  platform: Platform;
  username: string;
  displayName: string;
  connected: boolean;
  createdAt: string;
}

export interface ScheduleSlot {
  slotId: string;
  dayOfWeek: string;
  time: string;
  platform: Platform;
  accountId: string;
  enabled: boolean;
}

export interface CreatePostParams {
  platform: Platform;
  accountId: string;
  text: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  idempotencyKey?: string;
}

export interface UpdatePostParams {
  text?: string;
  mediaUrls?: string[];
  scheduledAt?: string;
}

export interface ListPostsParams {
  platform?: Platform;
  accountId?: string;
  status?: PostStatus;
  limit?: number;
  offset?: number;
}

export interface CreateScheduleSlotParams {
  dayOfWeek: string;
  time: string;
  platform: Platform;
  accountId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PostJob {
  jobId: string;
  postId: string;
  status: PostStatus;
  createdAt: string;
  completedAt: string | null;
  failureReason: string | null;
}
