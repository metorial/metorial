import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.stackexchange.com/2.3'
});

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
    if (Number.isNaN(d.getTime())) return undefined;
    return Math.floor(d.getTime() / 1000);
  }

  private async get<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    let response = await api.get(path, { params });
    let data = response.data;
    return {
      items: data.items ?? [],
      hasMore: data.has_more ?? false,
      quotaMax: data.quota_max ?? 0,
      quotaRemaining: data.quota_remaining ?? 0
    };
  }

  private async post<T>(
    path: string,
    body: Record<string, string> = {},
    params: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    let allParams = { ...this.baseParams(), ...params };
    let formBody = new URLSearchParams({ ...allParams, ...body }).toString();
    let response = await api.post(path, formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    let data = response.data;
    return {
      items: data.items ?? [],
      hasMore: data.has_more ?? false,
      quotaMax: data.quota_max ?? 0,
      quotaRemaining: data.quota_remaining ?? 0
    };
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
        filter: options.filter ?? '!nNPvSNe7ya'
      })
    );
  }

  async getQuestionsByIds(
    questionIds: string[],
    options: {
      filter?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    let ids = questionIds.join(';');
    return this.get(
      `/questions/${ids}`,
      this.buildParams({
        filter: options.filter ?? '!nNPvSNe7ya'
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
      `/questions/${questionId}/answers`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'votes',
        order: options.order ?? 'desc',
        filter: options.filter ?? '!nNPvSNdWme'
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
      `/questions/${questionId}/comments`,
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
      `/questions/${questionId}/linked`,
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
      `/questions/${questionId}/related`,
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
        filter: options.filter ?? '!nNPvSNe7ya'
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
        filter: options.filter ?? '!nNPvSNe7ya'
      })
    );
  }

  // Answers

  async getAnswersByIds(
    answerIds: string[],
    options: {
      filter?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    let ids = answerIds.join(';');
    return this.get(
      `/answers/${ids}`,
      this.buildParams({
        filter: options.filter ?? '!nNPvSNdWme'
      })
    );
  }

  async getAnswerComments(
    answerId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/answers/${answerId}/comments`,
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
    let ids = commentIds.join(';');
    return this.get(
      `/comments/${ids}`,
      this.buildParams({
        filter: options.filter
      })
    );
  }

  async addComment(postId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/posts/${postId}/comments/add`, { body });
  }

  async editComment(commentId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/comments/${commentId}/edit`, { body });
  }

  async deleteComment(commentId: string): Promise<ApiResponse<any>> {
    return this.post(`/comments/${commentId}/delete`);
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
    let ids = userIds.join(';');
    return this.get(
      `/users/${ids}`,
      this.buildParams({
        filter: options.filter
      })
    );
  }

  async getMe(options: { filter?: string } = {}): Promise<ApiResponse<any>> {
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
      `/users/${userId}/questions`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc',
        filter: '!nNPvSNe7ya'
      })
    );
  }

  async getUserAnswers(
    userId: string,
    options: PaginationParams & SortParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${userId}/answers`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'activity',
        order: options.order ?? 'desc',
        filter: '!nNPvSNdWme'
      })
    );
  }

  async getUserReputation(
    userId: string,
    options: PaginationParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${userId}/reputation`,
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
      `/users/${userId}/badges`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize,
        sort: options.sort ?? 'awarded',
        order: options.order ?? 'desc'
      })
    );
  }

  async getUserTopTags(userId: string): Promise<ApiResponse<any>> {
    return this.get(`/users/${userId}/top-answer-tags`, this.buildParams());
  }

  async getUserTimeline(
    userId: string,
    options: PaginationParams & DateRangeParams = {}
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/users/${userId}/timeline`,
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
    return this.get(
      '/me/inbox',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getInboxUnread(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    return this.get(
      '/me/inbox/unread',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getNotifications(options: PaginationParams = {}): Promise<ApiResponse<any>> {
    return this.get(
      '/me/notifications',
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getNotificationsUnread(options: PaginationParams = {}): Promise<ApiResponse<any>> {
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

  async getTagInfo(tags: string[]): Promise<ApiResponse<any>> {
    let tagStr = tags.join(';');
    return this.get(`/tags/${tagStr}/info`, this.buildParams());
  }

  async getTagFaq(tags: string[], options: PaginationParams = {}): Promise<ApiResponse<any>> {
    let tagStr = tags.join(';');
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
    let tagStr = tags.join(';');
    return this.get(
      `/tags/${tagStr}/synonyms`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  async getRelatedTags(tags: string[]): Promise<ApiResponse<any>> {
    let tagStr = tags.join(';');
    return this.get(`/tags/${tagStr}/related`, this.buildParams());
  }

  async getTagTopAnswerers(
    tag: string,
    period: 'all_time' | 'month' = 'all_time'
  ): Promise<ApiResponse<any>> {
    return this.get(`/tags/${tag}/top-answerers/${period}`, this.buildParams());
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
      `/posts/${postId}/revisions`,
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
      `/posts/${postId}/suggested-edits`,
      this.buildParams({
        page: options.page,
        pagesize: options.pageSize
      })
    );
  }

  // Network

  async getSites(options: PaginationParams = {}): Promise<ApiResponse<any>> {
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
    return this.post(`/questions/${questionId}/answers/add`, { body });
  }

  async editQuestion(
    questionId: string,
    title: string,
    body: string,
    tags: string[]
  ): Promise<ApiResponse<any>> {
    return this.post(`/questions/${questionId}/edit`, {
      title,
      body,
      tags: tags.join(';')
    });
  }

  async editAnswer(answerId: string, body: string): Promise<ApiResponse<any>> {
    return this.post(`/answers/${answerId}/edit`, { body });
  }

  async acceptAnswer(answerId: string): Promise<ApiResponse<any>> {
    return this.post(`/answers/${answerId}/accept`);
  }
}
