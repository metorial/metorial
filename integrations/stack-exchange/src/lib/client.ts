import { createApiServiceError, createAxios } from 'slates';
import {
  decodeResponse,
  pagination,
  pathIds,
  requireOAuth,
  stackExchangeError,
  tagPath
} from './response';

let api = createAxios({
  baseURL: 'https://api.stackexchange.com/2.3'
});
let backoffs = new Map<string, number>();
let methodKey = (path: string) =>
  path
    .replace(/^\/me(?=\/|$)/, '/users/{ids}')
    .replace(/\/-?\d+(?:;-?\d+)*(?=\/|$)/g, '/{ids}')
    .replace(/^\/tags\/[^/]+/, '/tags/{tags}');

export interface ClientConfig {
  token: string;
  key: string;
  site: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface DateRangeParams {
  fromDate?: string;
  toDate?: string;
}

export interface ApiResponse<T> {
  items: T[];
  hasMore: boolean;
  quotaMax: number;
  quotaRemaining: number;
}

export class Client {
  private token: string;
  private key: string;
  private site: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.key = config.key;
    this.site = config.site;
  }

  private baseParams(): Record<string, string> {
    let params: Record<string, string> = {
      site: this.site
    };
    if (this.key) {
      params.key = this.key;
    }
    if (this.token) {
      params.access_token = this.token;
    }
    return params;
  }

  private buildParams(
    extra: Record<string, string | number | boolean | undefined> = {}
  ): Record<string, string> {
    pagination(extra.page as number | undefined, extra.pagesize as number | undefined);
    for (let field of ['answers', 'views', 'user']) {
      let value = extra[field];
      if (value !== undefined && (typeof value !== 'number' || !Number.isSafeInteger(value)))
        throw createApiServiceError(`${field} must be an integer.`);
    }
    let params = this.baseParams();
    for (let [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null && v !== '') {
        params[k] = String(v);
      }
    }
    return params;
  }

  private toUnixTimestamp(dateStr: string | undefined): number | undefined {
    if (!dateStr) return undefined;
    let d = new Date(dateStr);
    if (Number.isNaN(d.getTime()))
      throw createApiServiceError('Provide a valid ISO 8601 date.');
    return Math.floor(d.getTime() / 1000);
  }

  private checkBackoff(path: string) {
    let until = backoffs.get(methodKey(path));
    if (until && until > Date.now())
      throw createApiServiceError(
        `Stack Exchange requires a backoff. Retry this method in ${Math.ceil((until - Date.now()) / 1000)} seconds.`
      );
  }

  private recordBackoff(value: unknown, path: string) {
    if (value && typeof value === 'object' && 'backoff' in value) {
      let backoff = value.backoff;
      if (typeof backoff === 'number' && Number.isSafeInteger(backoff) && backoff >= 0) {
        let key = methodKey(path);
        backoffs.set(key, Math.max(backoffs.get(key) ?? 0, Date.now() + backoff * 1000));
      }
    }
  }

  private decode<T>(value: unknown, path: string): ApiResponse<T> {
    this.recordBackoff(value, path);
    let data = decodeResponse(value, path);
    if (
      data.backoff !== undefined &&
      (!Number.isSafeInteger(data.backoff) || data.backoff < 0)
    )
      throw createApiServiceError('Stack Exchange returned an invalid backoff.');
    return {
      items: data.items as T[],
      hasMore: data.has_more,
      quotaMax: data.quota_max,
      quotaRemaining: data.quota_remaining
    };
  }

  private async get<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    this.checkBackoff(path);
    try {
      let response = await api.get(path, { params });
      return this.decode<T>(response.data, path);
    } catch (error) {
      throw stackExchangeError(error, body => this.recordBackoff(body, path));
    }
  }

  private async post<T>(
    path: string,
    body: Record<string, string> = {},
    params: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    requireOAuth(this.token);
    this.checkBackoff(path);
    let formBody = new URLSearchParams({
      ...this.baseParams(),
      ...params,
      ...body
    }).toString();
    try {
      let response = await api.post(path, formBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return this.decode<T>(response.data, path);
    } catch (error) {
      throw stackExchangeError(error, body => this.recordBackoff(body, path));
    }
  }

  // Questions

  async getQuestions(
    options: PaginationParams &
      SortParams &
      DateRangeParams & {
        tagged?: string;
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      '/questions',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc',
        fromdate: this.toUnixTimestamp(options.fromDate),
        todate: this.toUnixTimestamp(options.toDate),
        tagged: options.tagged,
        filter: options.filter ?? 'withbody'
      })
    );
  }

  async getQuestionsByIds(
    questionIds: string[],
    options: {
      filter?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    let ids = pathIds(questionIds, 'questionIds');
    return this.get(
      `/questions/${ids}`,
      this.buildParams({
        filter: options.filter ?? 'withbody'
      })
    );
  }

  async getQuestionAnswers(
    questionId: string,
    options: PaginationParams &
      SortParams & {
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/questions/${pathIds([questionId], 'questionId')}/answers`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'votes',
        order: options.order ?? 'desc',
        filter: options.filter ?? 'withbody'
      })
    );
  }

  async getQuestionComments(
    questionId: string,
    options: PaginationParams &
      SortParams & {
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/questions/${pathIds([questionId], 'questionId')}/comments`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'creation',
        order: options.order ?? 'desc',
        filter: options.filter
      })
    );
  }

  async getLinkedQuestions(
    questionId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/questions/${pathIds([questionId], 'questionId')}/linked`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc'
      })
    );
  }

  async getRelatedQuestions(
    questionId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/questions/${pathIds([questionId], 'questionId')}/related`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc'
      })
    );
  }

  // Search

  async search(
    options: PaginationParams &
      SortParams & {
        inTitle?: string;
        tagged?: string;
        notTagged?: string;
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      '/search',
      this.buildParams({
        intitle: options.inTitle,
        tagged: options.tagged,
        nottagged: options.notTagged,
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'relevance',
        order: options.order ?? 'desc',
        filter: options.filter ?? 'withbody'
      })
    );
  }

  async searchAdvanced(
    options: PaginationParams &
      SortParams &
      DateRangeParams & {
        query?: string;
        title?: string;
        body?: string;
        tagged?: string;
        notTagged?: string;
        accepted?: boolean;
        closed?: boolean;
        minAnswers?: number;
        minViews?: number;
        userId?: number;
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      '/search/advanced',
      this.buildParams({
        q: options.query,
        title: options.title,
        body: options.body,
        tagged: options.tagged,
        nottagged: options.notTagged,
        accepted: options.accepted,
        closed: options.closed,
        answers: options.minAnswers,
        views: options.minViews,
        user: options.userId,
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'relevance',
        order: options.order ?? 'desc',
        fromdate: this.toUnixTimestamp(options.fromDate),
        todate: this.toUnixTimestamp(options.toDate),
        filter: options.filter ?? 'withbody'
      })
    );
  }

  // Answers

  async getAnswersByIds(
    answerIds: string[],
    options: PaginationParams &
      SortParams & {
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    let ids = pathIds(answerIds, 'answerIds');
    return this.get(
      `/answers/${ids}`,
      this.buildParams({
        filter: options.filter ?? 'withbody',
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort,
        order: options.order
      })
    );
  }

  async getAnswerComments(
    answerId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/answers/${pathIds([answerId], 'answerId')}/comments`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'creation',
        order: options.order ?? 'desc'
      })
    );
  }

  // Comments

  async getCommentsByIds(
    commentIds: string[],
    options: {
      filter?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    let ids = pathIds(commentIds, 'commentIds');
    return this.get(
      `/comments/${ids}`,
      this.buildParams({
        filter: options.filter
      })
    );
  }

  async addComment(postId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/posts/${pathIds([postId], 'postId')}/comments/add`, { body });
  }

  async editComment(commentId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/comments/${pathIds([commentId], 'commentId')}/edit`, { body });
  }

  async deleteComment(commentId: string): Promise<ApiResponse<any>> {
    return this.post(`/comments/${pathIds([commentId], 'commentId')}/delete`);
  }

  // Users

  async getUsers(
    options: PaginationParams &
      SortParams & {
        inName?: string;
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      '/users',
      this.buildParams({
        inname: options.inName,
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'reputation',
        order: options.order ?? 'desc',
        filter: options.filter
      })
    );
  }

  async getUsersByIds(
    userIds: string[],
    options: {
      filter?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    let ids = pathIds(userIds, 'userIds');
    return this.get(
      `/users/${ids}`,
      this.buildParams({
        filter: options.filter
      })
    );
  }

  async getMe(options: { filter?: string } = {}): Promise<ApiResponse<any>> {
    requireOAuth(this.token);
    return this.get(
      '/me',
      this.buildParams({
        filter: options.filter
      })
    );
  }

  async getUserQuestions(
    userId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${pathIds([userId], 'userId')}/questions`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc',
        filter: 'withbody'
      })
    );
  }

  async getUserAnswers(
    userId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${pathIds([userId], 'userId')}/answers`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc',
        filter: 'withbody'
      })
    );
  }

  async getUserReputation(
    userId: string,
    options: PaginationParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${pathIds([userId], 'userId')}/reputation`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getUserBadges(
    userId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${pathIds([userId], 'userId')}/badges`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'rank',
        order: options.order ?? 'desc'
      })
    );
  }

  async getUserTopTags(userId: string): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${pathIds([userId], 'userId')}/top-answer-tags`,
      this.buildParams()
    );
  }

  async getUserTimeline(
    userId: string,
    options: PaginationParams & DateRangeParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${pathIds([userId], 'userId')}/timeline`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        fromdate: this.toUnixTimestamp(options.fromDate),
        todate: this.toUnixTimestamp(options.toDate)
      })
    );
  }

  // Inbox & Notifications (requires auth)

  async getInbox(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    requireOAuth(this.token);
    return this.get(
      '/me/inbox',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getInboxUnread(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    requireOAuth(this.token);
    return this.get(
      '/me/inbox/unread',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getNotifications(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    requireOAuth(this.token);
    return this.get(
      '/me/notifications',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getNotificationsUnread(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    requireOAuth(this.token);
    return this.get(
      '/me/notifications/unread',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  // Tags

  async getTags(
    options: PaginationParams &
      SortParams & {
        inName?: string;
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      '/tags',
      this.buildParams({
        inname: options.inName,
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'popular',
        order: options.order ?? 'desc',
        filter: options.filter
      })
    );
  }

  async getTagInfo(tags: string[], options: PaginationParams = {}): Promise<ApiResponse<any>> {
    let tagStr = tagPath(tags);
    return this.get(
      `/tags/${tagStr}/info`,
      this.buildParams({ page: options.page, pagesize: options.pageSize })
    );
  }

  async getTagFaq(tags: string[], options: PaginationParams = {}): Promise<ApiResponse<any>> {
    let tagStr = tagPath(tags, 5);
    return this.get(
      `/tags/${tagStr}/faq`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getTagSynonyms(
    tags: string[],
    options: PaginationParams = {}
  ): Promise<ApiResponse<any>> {
    let tagStr = tagPath(tags, 20);
    return this.get(
      `/tags/${tagStr}/synonyms`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getRelatedTags(
    tags: string[],
    options: PaginationParams = {}
  ): Promise<ApiResponse<any>> {
    let tagStr = tagPath(tags, 4);
    return this.get(
      `/tags/${tagStr}/related`,
      this.buildParams({ page: options.page, pagesize: options.pageSize })
    );
  }

  async getTagTopAnswerers(
    tag: string,
    period: 'all_time' | 'month' = 'all_time'
  ): Promise<ApiResponse<any>> {
    return this.get(`/tags/${tagPath([tag], 1)}/top-answerers/${period}`, this.buildParams());
  }

  // Badges

  async getBadges(
    options: PaginationParams &
      SortParams & {
        inName?: string;
        filter?: string;
      } = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      '/badges',
      this.buildParams({
        inname: options.inName,
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'rank',
        order: options.order ?? 'asc',
        filter: options.filter
      })
    );
  }

  // Posts & Revisions

  async getPostRevisions(
    postId: string,
    options: PaginationParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/posts/${pathIds([postId], 'postId')}/revisions`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getPostSuggestedEdits(
    postId: string,
    options: PaginationParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/posts/${pathIds([postId], 'postId')}/suggested-edits`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  // Network

  async getSites(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    pagination(options.page, options.pageSize, true);
    return this.get('/sites', {
      page: String(options.page ?? 1),
      pagesize: String(options.pageSize ?? 100),
      ...(this.key ? { key: this.key } : {})
    });
  }

  async getSiteInfo(): Promise<ApiResponse<any>> {
    return this.get('/info', this.buildParams());
  }

  // Write operations (require auth + write_access scope)

  async createQuestion(
    title: string,
    body: string,
    tags: string[]
  ): Promise<ApiResponse<any>> {
    return this.post('/questions/add', {
      title,
      body,
      tags: tags.join(';')
    });
  }

  async createAnswer(questionId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/questions/${pathIds([questionId], 'questionId')}/answers/add`, {
      body
    });
  }

  async editQuestion(
    questionId: string,
    title: string,
    body: string,
    tags: string[]
  ): Promise<ApiResponse<any>> {
    return this.post(`/questions/${pathIds([questionId], 'questionId')}/edit`, {
      title,
      body,
      tags: tags.join(';')
    });
  }

  async editAnswer(answerId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/answers/${pathIds([answerId], 'answerId')}/edit`, { body });
  }

  async acceptAnswer(answerId: string, undo = false): Promise<ApiResponse<any>> {
    return this.post(
      `/answers/${pathIds([answerId], 'answerId')}/accept${undo ? '/undo' : ''}`
    );
  }
}
