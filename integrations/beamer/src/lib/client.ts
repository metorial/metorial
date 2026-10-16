import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

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
  featureRequestTitle?: string;
  visible?: boolean;
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
  id: string | number;
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
  traceableLinks?: boolean;
  ignoreRequestDetails?: boolean;
  saveViews?: boolean;
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
  userFirstName?: string;
  userLastName?: string;
  filter?: string;
  url?: string;
  createdAt?: string;
  language?: string;
  mobile?: boolean;
  multi?: boolean;
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
  language?: string;
  search?: string;
  visible?: boolean;
  dateFrom?: string;
  dateTo?: string;
  maxResults?: number;
  page?: number;
}

export interface ListReactionsParams {
  reaction?: 'positive' | 'neutral' | 'negative';
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

export interface BeamerVote {
  id: number;
  date: string;
  featureRequestTitle: string;
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  url: string | null;
}

export interface FeedUrlParams {
  language?: string;
  filterByUrl?: boolean;
  filter?: string;
  forceFilter?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userId?: string;
  theme?: string;
}

export let validateInteger = (
  value: number | undefined,
  name: string,
  min = 1,
  max?: number
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${name} must be a whole number from ${min}${max === undefined ? '' : ` to ${max}`}.`
    );
  }
};

let validatePage = (
  params: { maxResults?: number; page?: number } | undefined,
  maximum: number
) => {
  validateInteger(params?.maxResults, 'maxResults', 1, maximum);
  validateInteger(params?.page, 'page', 0);
};

let validateDates = (
  params:
    | {
        dateFrom?: string;
        dateTo?: string;
        date?: string;
        dueDate?: string;
        createdAt?: string;
      }
    | undefined
) => {
  for (let [name, value] of Object.entries(params ?? {})) {
    if (
      ['dateFrom', 'dateTo', 'date', 'dueDate', 'createdAt'].includes(name) &&
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(String(value)) ||
        !Number.isFinite(Date.parse(String(value))))
    ) {
      throw createApiServiceError(`${name} must be an ISO-8601 date or date and time.`);
    }
  }
  if (
    params?.dateFrom &&
    params.dateTo &&
    Date.parse(params.dateFrom) > Date.parse(params.dateTo)
  ) {
    throw createApiServiceError('dateFrom must be on or before dateTo.');
  }
};

let validateTranslations = (
  data: UpdatePostParams | UpdateFeatureRequestParams,
  creating = false
) => {
  if (creating || data.title !== undefined || data.content !== undefined) {
    if (
      !data.title?.length ||
      data.title.length !== data.content?.length ||
      data.title.some(title => !title.trim())
    ) {
      throw createApiServiceError(
        'Provide at least one translation with a nonempty title and matching content.'
      );
    }
    if (
      data.language &&
      (data.language.length !== data.title.length ||
        data.language.some(language => !/^[a-z]{2}$/i.test(language)))
    ) {
      throw createApiServiceError(
        'Provide a two-letter language code for every translation when languages are supplied.'
      );
    }
  }
};

let apiNumber = z
  .union([z.number(), z.string().regex(/^-?\d+(?:\.\d+)?$/)])
  .transform(Number)
  .pipe(z.number().finite());
let apiId = apiNumber.pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
let apiBoolean = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform(value => value === true || value === 'true');
let nullableText = z
  .string()
  .nullish()
  .transform(value => value ?? null);
let responseText = z
  .string()
  .nullish()
  .transform(value => value ?? '');
let translationSchema = z
  .object({
    title: z.string(),
    content: z.string(),
    contentHtml: z.string(),
    language: z.string(),
    category: responseText,
    linkUrl: responseText,
    linkText: responseText,
    images: z.array(z.string()).default([])
  })
  .passthrough();
let postResponseSchema = z
  .object({
    id: apiId,
    date: z.string(),
    dueDate: nullableText,
    published: apiBoolean,
    pinned: apiBoolean,
    showInWidget: apiBoolean,
    showInStandalone: apiBoolean,
    category: z.string(),
    boostedAnnouncement: nullableText,
    translations: z.array(translationSchema),
    filter: nullableText,
    filterUrl: nullableText,
    autoOpen: apiBoolean,
    editionDate: nullableText,
    feedbackEnabled: apiBoolean,
    reactionsEnabled: apiBoolean,
    views: apiNumber,
    uniqueViews: apiNumber,
    clicks: apiNumber,
    feedbacks: apiNumber,
    positiveReactions: apiNumber,
    neutralReactions: apiNumber,
    negativeReactions: apiNumber
  })
  .passthrough();
let featureResponseSchema = z
  .object({
    id: apiId,
    date: z.string(),
    visible: apiBoolean,
    category: nullableText,
    status: nullableText,
    translations: z.array(
      z
        .object({
          title: z.string(),
          content: z.string(),
          contentHtml: z.string(),
          language: z.string(),
          permalink: nullableText,
          images: z.array(z.string()).default([])
        })
        .passthrough()
    ),
    votesCount: apiNumber,
    commentsCount: apiNumber,
    notes: nullableText,
    filters: nullableText,
    internalUserEmail: nullableText,
    internalUserFirstname: nullableText,
    internalUserLastname: nullableText,
    userId: nullableText,
    userEmail: nullableText,
    userFirstname: nullableText,
    userLastname: nullableText,
    userCustomAttributes: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform(value => value ?? null)
  })
  .passthrough();
let commentResponseSchema = z
  .object({
    id: apiId,
    date: z.string(),
    text: z.string(),
    postTitle: responseText,
    featureRequestTitle: z.string().optional(),
    visible: apiBoolean.optional(),
    userId: nullableText,
    userEmail: nullableText,
    userFirstName: nullableText,
    userLastName: nullableText,
    url: nullableText,
    userCustomAttributes: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform(value => value ?? null)
  })
  .passthrough();
let reactionResponseSchema = commentResponseSchema
  .omit({ text: true })
  .extend({ reaction: z.string() });
let voteResponseSchema = z
  .object({
    id: apiId,
    date: z.string(),
    featureRequestTitle: z.string(),
    userId: nullableText,
    userEmail: nullableText,
    userFirstName: nullableText,
    userLastName: nullableText,
    url: nullableText
  })
  .passthrough();
let npsResponseSchema = z
  .object({
    id: z.union([z.string().min(1), z.number()]),
    date: z.string(),
    score: apiNumber,
    feedback: nullableText,
    userId: nullableText,
    userEmail: nullableText,
    userFirstName: nullableText,
    userLastName: nullableText,
    userCustomAttributes: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform(value => value ?? null)
  })
  .passthrough();
let parseResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError('Beamer returned an unexpected response format.', {
      reason: 'invalid_provider_response'
    });
  return result.data;
};

export class Client {
  private axios;

  constructor(params: { token: string }) {
    if (!params.token.trim()) throw createApiServiceError('A Beamer API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      authHeader: { name: 'Beamer-Api-Key', value: params.token },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Beamer', reason: 'beamer_api_error' })
    });
  }

  // --- Posts ---

  async createPost(data: CreatePostParams): Promise<BeamerPost> {
    validateTranslations(data, true);
    validateDates(data);
    let response = await this.axios.post('/posts', data);
    return parseResponse(postResponseSchema, response.data);
  }

  async getPost(postId: number): Promise<BeamerPost> {
    validateInteger(postId, 'postId');
    let response = await this.axios.get(`/posts/${postId}`);
    return parseResponse(postResponseSchema, response.data);
  }

  async updatePost(postId: number, data: UpdatePostParams): Promise<BeamerPost> {
    validateInteger(postId, 'postId');
    validateTranslations(data);
    validateDates(data);
    if (!Object.values(data).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one post field to update.');
    let response = await this.axios.put(`/posts/${postId}`, data);
    return parseResponse(postResponseSchema, response.data);
  }

  async deletePost(postId: number): Promise<void> {
    validateInteger(postId, 'postId');
    await this.axios.delete(`/posts/${postId}`);
  }

  async listPosts(params?: ListPostsParams): Promise<BeamerPost[]> {
    validatePage(params, 10);
    validateDates(params);
    let response = await this.axios.get('/posts', {
      params: { ...params, saveViews: false, ignoreRequestDetails: true }
    });
    return parseResponse(postResponseSchema.array(), response.data);
  }

  async countPosts(params?: ListPostsParams): Promise<number> {
    let response = await this.axios.get('/posts/count', { params });
    return parseResponse(z.object({ count: apiNumber }), response.data).count;
  }

  // --- Post Comments ---

  async listPostComments(
    postId: number,
    params?: ListCommentsParams
  ): Promise<BeamerComment[]> {
    validateInteger(postId, 'postId');
    validatePage(params, 10);
    validateDates(params);
    let response = await this.axios.get(`/posts/${postId}/comments`, { params });
    return parseResponse(commentResponseSchema.array(), response.data);
  }

  async createPostComment(postId: number, data: CreateCommentParams): Promise<BeamerComment> {
    validateInteger(postId, 'postId');
    if (!data.text.trim()) throw createApiServiceError('Comment text must not be empty.');
    let response = await this.axios.post(`/posts/${postId}/comments`, data);
    return parseResponse(commentResponseSchema, response.data);
  }

  async deletePostComment(postId: number, commentId: number): Promise<void> {
    validateInteger(postId, 'postId');
    validateInteger(commentId, 'commentId');
    await this.axios.delete(`/posts/${postId}/comments/${commentId}`);
  }

  async countPostComments(postId: number): Promise<number> {
    validateInteger(postId, 'postId');
    let response = await this.axios.get(`/posts/${postId}/comments/count`);
    return parseResponse(z.object({ count: apiNumber }), response.data).count;
  }

  // --- Post Reactions ---

  async listPostReactions(
    postId: number,
    params?: ListReactionsParams
  ): Promise<BeamerReaction[]> {
    validateInteger(postId, 'postId');
    validatePage(params, 10);
    validateDates(params);
    let response = await this.axios.get(`/posts/${postId}/reactions`, { params });
    return parseResponse(reactionResponseSchema.array(), response.data);
  }

  async createPostReaction(
    postId: number,
    data: CreateReactionParams
  ): Promise<BeamerReaction> {
    validateInteger(postId, 'postId');
    let response = await this.axios.post(`/posts/${postId}/reactions`, data);
    return parseResponse(reactionResponseSchema, response.data);
  }

  async deletePostReaction(postId: number, reactionId: number): Promise<void> {
    validateInteger(postId, 'postId');
    validateInteger(reactionId, 'reactionId');
    await this.axios.delete(`/posts/${postId}/reactions/${reactionId}`);
  }

  async countPostReactions(postId: number): Promise<number> {
    validateInteger(postId, 'postId');
    let response = await this.axios.get(`/posts/${postId}/reactions/count`);
    return parseResponse(z.object({ count: apiNumber }), response.data).count;
  }

  // --- Unread ---

  async getUnreadCount(params?: UnreadCountParams): Promise<UnreadCountResponse> {
    validateDates(params);
    let response = await this.axios.get('/unread/count', { params });
    return parseResponse(
      z.object({ count: apiNumber, url: z.string(), popupUrl: z.string() }),
      response.data
    );
  }

  // --- Feature Requests ---

  async createFeatureRequest(data: CreateFeatureRequestParams): Promise<BeamerFeatureRequest> {
    validateTranslations(data, true);
    validateDates(data);
    validateInteger(data.votesCount, 'votesCount', 0);
    let response = await this.axios.post('/requests', data);
    return parseResponse(featureResponseSchema, response.data);
  }

  async getFeatureRequest(requestId: number): Promise<BeamerFeatureRequest> {
    validateInteger(requestId, 'requestId');
    let response = await this.axios.get(`/requests/${requestId}`);
    return parseResponse(featureResponseSchema, response.data);
  }

  async updateFeatureRequest(
    requestId: number,
    data: UpdateFeatureRequestParams
  ): Promise<BeamerFeatureRequest> {
    validateInteger(requestId, 'requestId');
    validateTranslations(data);
    validateDates(data);
    validateInteger(data.votesCount, 'votesCount', 0);
    if (!Object.values(data).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one feature request field to update.');
    let response = await this.axios.put(`/requests/${requestId}`, data);
    return parseResponse(featureResponseSchema, response.data);
  }

  async deleteFeatureRequest(requestId: number): Promise<void> {
    validateInteger(requestId, 'requestId');
    await this.axios.delete(`/requests/${requestId}`);
  }

  async listFeatureRequests(
    params?: ListFeatureRequestsParams
  ): Promise<BeamerFeatureRequest[]> {
    validatePage(params, 10);
    validateDates(params);
    let response = await this.axios.get('/requests', { params });
    return parseResponse(featureResponseSchema.array(), response.data);
  }

  async countFeatureRequests(params?: ListFeatureRequestsParams): Promise<number> {
    let response = await this.axios.get('/requests/count', { params });
    return parseResponse(z.object({ count: apiNumber }), response.data).count;
  }

  // --- Feature Request Comments ---

  async listFeatureRequestComments(
    requestId: number,
    params?: ListCommentsParams
  ): Promise<BeamerComment[]> {
    validateInteger(requestId, 'requestId');
    validatePage(params, 10);
    validateDates(params);
    let response = await this.axios.get(`/requests/${requestId}/comments`, { params });
    return parseResponse(commentResponseSchema.array(), response.data);
  }

  async createFeatureRequestComment(
    requestId: number,
    data: FeatureRequestCommentParams
  ): Promise<BeamerComment> {
    validateInteger(requestId, 'requestId');
    if (!data.text.trim()) throw createApiServiceError('Comment text must not be empty.');
    let response = await this.axios.post(`/requests/${requestId}/comments`, data);
    return parseResponse(commentResponseSchema, response.data);
  }

  async deleteFeatureRequestComment(requestId: number, commentId: number): Promise<void> {
    validateInteger(requestId, 'requestId');
    validateInteger(commentId, 'commentId');
    await this.axios.delete(`/requests/${requestId}/comments/${commentId}`);
  }

  // --- Feature Request Votes ---

  async createFeatureRequestVote(
    requestId: number,
    data: FeatureRequestVoteParams
  ): Promise<BeamerVote> {
    validateInteger(requestId, 'requestId');
    let response = await this.axios.post(`/requests/${requestId}/votes`, data);
    return parseResponse(voteResponseSchema, response.data);
  }

  async deleteFeatureRequestVote(requestId: number, voteId: number): Promise<void> {
    validateInteger(requestId, 'requestId');
    validateInteger(voteId, 'voteId');
    await this.axios.delete(`/requests/${requestId}/votes/${voteId}`);
  }

  async countFeatureRequestVotes(requestId: number): Promise<number> {
    validateInteger(requestId, 'requestId');
    let response = await this.axios.get(`/requests/${requestId}/votes/count`);
    return parseResponse(z.object({ count: apiNumber }), response.data).count;
  }

  // --- NPS ---

  async listNpsResponses(params?: ListNpsParams): Promise<BeamerNpsResponse[]> {
    validatePage(params, 100);
    validateDates(params);
    validateInteger(params?.scoreFrom, 'scoreFrom', 0, 10);
    validateInteger(params?.scoreTo, 'scoreTo', 0, 10);
    if (
      params?.scoreFrom !== undefined &&
      params.scoreTo !== undefined &&
      params.scoreFrom > params.scoreTo
    )
      throw createApiServiceError('scoreFrom must not exceed scoreTo.');
    let response = await this.axios.get('/nps', { params });
    return parseResponse(npsResponseSchema.array(), response.data);
  }

  async countNpsResponses(params?: ListNpsParams): Promise<number> {
    let response = await this.axios.get('/nps/count', { params });
    return parseResponse(z.object({ count: apiNumber }), response.data).count;
  }

  async checkNps(
    params: NpsCheckParams
  ): Promise<{ shouldShow: boolean; url?: string | null }> {
    validateDates(params);
    let response = await this.axios.get('/nps/check', { params });
    return parseResponse(
      z.object({ shouldShow: apiBoolean, url: z.string().nullable().optional() }),
      response.data
    );
  }

  async getFeedUrl(params: FeedUrlParams): Promise<{ url: string }> {
    let response = await this.axios.get('/url', { params });
    return parseResponse(z.object({ url: z.string() }), response.data);
  }

  async listFeatureRequestVotes(
    requestId: number,
    params?: ListReactionsParams
  ): Promise<BeamerVote[]> {
    validateInteger(requestId, 'requestId');
    validatePage(params, 10);
    validateDates(params);
    let response = await this.axios.get(`/requests/${requestId}/votes`, { params });
    return parseResponse(voteResponseSchema.array(), response.data);
  }

  // --- Ping ---

  async ping(): Promise<{ name: string }> {
    let response = await this.axios.post('/ping');
    return parseResponse(z.object({ name: z.string() }), response.data);
  }
}
