import { createAxios } from 'slates';

let BASE_URL = 'https://api.getbeamer.com/v0';

export interface PostTranslation {
  title: string;
  content: string;
  contentHtml: string;
  language: string;
  category: string;
  linkUrl: string;
  linkText: string;
  images: string[];
}

export interface BeamerPost {
  id: number;
  date: string;
  dueDate: string | null;
  published: boolean;
  pinned: boolean;
  showInWidget: boolean;
  showInStandalone: boolean;
  category: string;
  boostedAnnouncement: string | null;
  translations: PostTranslation[];
  filter: string | null;
  filterUrl: string | null;
  autoOpen: boolean;
  editionDate: string | null;
  feedbackEnabled: boolean;
  reactionsEnabled: boolean;
  views: number;
  uniqueViews: number;
  clicks: number;
  feedbacks: number;
  positiveReactions: number;
  neutralReactions: number;
  negativeReactions: number;
}

export interface BeamerComment {
  id: number;
  date: string;
  text: string;
  postTitle: string;
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  url: string | null;
  userCustomAttributes: Record<string, unknown> | null;
}

export interface BeamerReaction {
  id: number;
  date: string;
  reaction: string;
  postTitle: string;
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  url: string | null;
  userCustomAttributes: Record<string, unknown> | null;
}

export interface BeamerFeatureRequest {
  id: number;
  date: string;
  visible: boolean;
  category: string | null;
  status: string | null;
  translations: {
    title: string;
    content: string;
    contentHtml: string;
    language: string;
    permalink: string | null;
    images: string[];
  }[];
  votesCount: number;
  commentsCount: number;
  notes: string | null;
  filters: string | null;
  internalUserEmail: string | null;
  internalUserFirstname: string | null;
  internalUserLastname: string | null;
  userId: string | null;
  userEmail: string | null;
  userFirstname: string | null;
  userLastname: string | null;
  userCustomAttributes: Record<string, unknown> | null;
}

export interface BeamerNpsResponse {
  id: number;
  date: string;
  score: number;
  feedback: string | null;
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userCustomAttributes: Record<string, unknown> | null;
}

export interface UnreadCountResponse {
  count: number;
  url: string;
  popupUrl: string;
}

export interface CreatePostParams {
  title: string[];
  content: string[];
  language?: string[];
  category?: string;
  customCategory?: string[];
  publish?: boolean;
  archive?: boolean;
  pinned?: boolean;
  showInWidget?: boolean;
  showInStandalone?: boolean;
  boostedAnnouncement?: string;
  linkUrl?: string[];
  linkText?: string[];
  linksInNewWindow?: boolean;
  date?: string;
  dueDate?: string;
  filter?: string;
  filterUserId?: string;
  filterUrl?: string;
  enableFeedback?: boolean;
  enableReactions?: boolean;
  enableSocialShare?: boolean;
  autoOpen?: boolean;
  sendPushNotification?: boolean;
  userEmail?: string;
  fixedBoostedAnnouncement?: boolean;
}

export interface UpdatePostParams extends Partial<CreatePostParams> {}

export interface ListPostsParams {
  filter?: string;
  forceFilter?: string;
  filterUrl?: string;
  dateFrom?: string;
  dateTo?: string;
  language?: string;
  category?: string;
  published?: boolean;
  archived?: boolean;
  expired?: boolean;
  filterByUserId?: boolean;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userId?: string;
  maxResults?: number;
  page?: number;
  ignoreFilters?: boolean;
}

export interface CreateCommentParams {
  text: string;
  userId?: string;
  userEmail?: string;
  userFirstname?: string;
  userLastname?: string;
}

export interface CreateReactionParams {
  reaction: 'positive' | 'neutral' | 'negative';
  userId?: string;
  userEmail?: string;
  userFirstname?: string;
  userLastname?: string;
}

export interface CreateFeatureRequestParams {
  title: string[];
  content: string[];
  language?: string[];
  category?: string;
  status?: string;
  visible?: boolean;
  notes?: string;
  filters?: string;
  votesCount?: number;
  date?: string;
  internalUserEmail?: string;
  userId?: string;
  userEmail?: string;
  userFirstname?: string;
  userLastname?: string;
}

export interface UpdateFeatureRequestParams extends Partial<CreateFeatureRequestParams> {}

export interface ListFeatureRequestsParams {
  filters?: string;
  dateFrom?: string;
  dateTo?: string;
  language?: string;
  category?: string;
  status?: string;
  visible?: boolean;
  search?: string;
  maxResults?: number;
  page?: number;
}

export interface ListNpsParams {
  dateFrom?: string;
  dateTo?: string;
  scoreFrom?: number;
  scoreTo?: number;
  search?: string;
  maxResults?: number;
  page?: number;
}

export interface NpsCheckParams {
  userId?: string;
  userEmail?: string;
  beamerId?: string;
}

export interface UnreadCountParams {
  filter?: string;
  forceFilter?: string;
  filterUrl?: string;
  dateFrom?: string;
  language?: string;
  category?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userId?: string;
  ignoreFilters?: boolean;
}

export interface ListCommentsParams {
  dateFrom?: string;
  dateTo?: string;
  maxResults?: number;
  page?: number;
}

export interface ListReactionsParams {
  dateFrom?: string;
  dateTo?: string;
  maxResults?: number;
  page?: number;
}

export interface FeatureRequestCommentParams {
  text: string;
  userId?: string;
  userEmail?: string;
  userFirstname?: string;
  userLastname?: string;
  visible?: boolean;
}

export interface FeatureRequestVoteParams {
  userId?: string;
  userEmail?: string;
  userFirstname?: string;
  userLastname?: string;
}

export class Client {
  private axios;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Beamer-Api-Key': params.token
      }
    });
  }

  // --- Posts ---

  async createPost(data: CreatePostParams): Promise<BeamerPost> {
    let response = await this.axios.post('/posts', data);
    return response.data;
  }

  async getPost(postId: number): Promise<BeamerPost> {
    let response = await this.axios.get(`/posts/${postId}`);
    return response.data;
  }

  async updatePost(postId: number, data: UpdatePostParams): Promise<BeamerPost> {
    let response = await this.axios.put(`/posts/${postId}`, data);
    return response.data;
  }

  async deletePost(postId: number): Promise<void> {
    await this.axios.delete(`/posts/${postId}`);
  }

  async listPosts(params?: ListPostsParams): Promise<BeamerPost[]> {
    let response = await this.axios.get('/posts', { params });
    return response.data;
  }

  async countPosts(params?: ListPostsParams): Promise<number> {
    let response = await this.axios.get('/posts/count', { params });
    return response.data;
  }

  // --- Post Comments ---

  async listPostComments(
    postId: number,
    params?: ListCommentsParams
  ): Promise<BeamerComment[]> {
    let response = await this.axios.get(`/posts/${postId}/comments`, { params });
    return response.data;
  }

  async createPostComment(postId: number, data: CreateCommentParams): Promise<BeamerComment> {
    let response = await this.axios.post(`/posts/${postId}/comments`, data);
    return response.data;
  }

  async deletePostComment(postId: number, commentId: number): Promise<void> {
    await this.axios.delete(`/posts/${postId}/comments/${commentId}`);
  }

  async countPostComments(postId: number): Promise<number> {
    let response = await this.axios.get(`/posts/${postId}/comments/count`);
    return response.data;
  }

  // --- Post Reactions ---

  async listPostReactions(
    postId: number,
    params?: ListReactionsParams
  ): Promise<BeamerReaction[]> {
    let response = await this.axios.get(`/posts/${postId}/reactions`, { params });
    return response.data;
  }

  async createPostReaction(
    postId: number,
    data: CreateReactionParams
  ): Promise<BeamerReaction> {
    let response = await this.axios.post(`/posts/${postId}/reactions`, data);
    return response.data;
  }

  async deletePostReaction(postId: number, reactionId: number): Promise<void> {
    await this.axios.delete(`/posts/${postId}/reactions/${reactionId}`);
  }

  async countPostReactions(postId: number): Promise<number> {
    let response = await this.axios.get(`/posts/${postId}/reactions/count`);
    return response.data;
  }

  // --- Unread ---

  async getUnreadCount(params?: UnreadCountParams): Promise<UnreadCountResponse> {
    let response = await this.axios.get('/unread/count', { params });
    return response.data;
  }

  // --- Feature Requests ---

  async createFeatureRequest(data: CreateFeatureRequestParams): Promise<BeamerFeatureRequest> {
    let response = await this.axios.post('/requests', data);
    return response.data;
  }

  async getFeatureRequest(requestId: number): Promise<BeamerFeatureRequest> {
    let response = await this.axios.get(`/requests/${requestId}`);
    return response.data;
  }

  async updateFeatureRequest(
    requestId: number,
    data: UpdateFeatureRequestParams
  ): Promise<BeamerFeatureRequest> {
    let response = await this.axios.put(`/requests/${requestId}`, data);
    return response.data;
  }

  async deleteFeatureRequest(requestId: number): Promise<void> {
    await this.axios.delete(`/requests/${requestId}`);
  }

  async listFeatureRequests(
    params?: ListFeatureRequestsParams
  ): Promise<BeamerFeatureRequest[]> {
    let response = await this.axios.get('/requests', { params });
    return response.data;
  }

  async countFeatureRequests(params?: ListFeatureRequestsParams): Promise<number> {
    let response = await this.axios.get('/requests/count', { params });
    return response.data;
  }

  // --- Feature Request Comments ---

  async listFeatureRequestComments(
    requestId: number,
    params?: ListCommentsParams
  ): Promise<BeamerComment[]> {
    let response = await this.axios.get(`/requests/${requestId}/comments`, { params });
    return response.data;
  }

  async createFeatureRequestComment(
    requestId: number,
    data: FeatureRequestCommentParams
  ): Promise<BeamerComment> {
    let response = await this.axios.post(`/requests/${requestId}/comments`, data);
    return response.data;
  }

  async deleteFeatureRequestComment(requestId: number, commentId: number): Promise<void> {
    await this.axios.delete(`/requests/${requestId}/comments/${commentId}`);
  }

  // --- Feature Request Votes ---

  async createFeatureRequestVote(
    requestId: number,
    data: FeatureRequestVoteParams
  ): Promise<unknown> {
    let response = await this.axios.post(`/requests/${requestId}/votes`, data);
    return response.data;
  }

  async deleteFeatureRequestVote(requestId: number, voteId: number): Promise<void> {
    await this.axios.delete(`/requests/${requestId}/votes/${voteId}`);
  }

  async countFeatureRequestVotes(requestId: number): Promise<number> {
    let response = await this.axios.get(`/requests/${requestId}/votes/count`);
    return response.data;
  }

  // --- NPS ---

  async listNpsResponses(params?: ListNpsParams): Promise<BeamerNpsResponse[]> {
    let response = await this.axios.get('/nps', { params });
    return response.data;
  }

  async countNpsResponses(params?: ListNpsParams): Promise<number> {
    let response = await this.axios.get('/nps/count', { params });
    return response.data;
  }

  async checkNps(params: NpsCheckParams): Promise<unknown> {
    let response = await this.axios.get('/nps/check', { params });
    return response.data;
  }

  // --- Ping ---

  async ping(): Promise<{ name: string }> {
    let response = await this.axios.post('/ping');
    return response.data;
  }
}
