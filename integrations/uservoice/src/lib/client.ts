import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let uservoiceError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'UserVoice',
    reason: 'uservoice_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let data = helpers.getResponseWithBody(input)?.data;
      if (!isApiErrorRecord(data) || !isApiErrorRecord(data.errors)) return undefined;
      let details: string[] = [];
      for (let [field, value] of Object.entries(data.errors)) {
        let messages: string[] = [];
        helpers.collectDetails(value, messages);
        if (messages.length) details.push(`${field}: ${messages.join('; ')}`);
      }
      return details.length ? details.join('; ') : undefined;
    },
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      return isApiErrorRecord(data) &&
        isApiErrorRecord(data.errors) &&
        typeof data.errors.error === 'string'
        ? data.errors.error
        : undefined;
    }
  });

export let resolveSubdomain = (value: unknown, legacyValue?: unknown): string => {
  let subdomain = value ?? legacyValue;
  if (
    typeof subdomain !== 'string' ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)
  ) {
    throw createApiServiceError(
      'Enter the UserVoice subdomain, without a URL or domain suffix.'
    );
  }
  return subdomain;
};

export let rejectUserVoiceErrors = (response: { data: unknown }) => {
  let data = response.data;
  if (
    isApiErrorRecord(data) &&
    data.errors != null &&
    ((typeof data.errors === 'string' && data.errors.length > 0) ||
      (typeof data.errors === 'object' && Object.keys(data.errors).length > 0))
  ) {
    throw uservoiceError({ response });
  }
  return response;
};

export interface PaginationResult {
  page?: number;
  perPage?: number;
  totalPages?: number;
  totalRecords?: number;
  cursor?: string;
}

export interface ListParams {
  page?: number;
  perPage?: number;
  sort?: string;
  cursor?: string;
  includes?: string[];
  updatedAfter?: string;
  updatedBefore?: string;
  [key: string]: unknown;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; subdomain?: string; legacySubdomain?: unknown }) {
    let subdomain = resolveSubdomain(config.subdomain, config.legacySubdomain);
    this.http = createAuthenticatedAxios({
      baseURL: `https://${subdomain}.uservoice.com/api/v2/admin`,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: uservoiceError
    });
    this.http.interceptors.response.use(response => {
      rejectUserVoiceErrors(response);
      return response;
    });
  }

  private firstRecord(data: any, collection: string): any {
    let record = data?.[collection]?.[0];
    if (!isApiErrorRecord(record)) {
      throw createApiServiceError(
        `UserVoice did not return a ${collection} record for this operation.`
      );
    }
    return record;
  }

  private mapPagination(raw: any): PaginationResult {
    return {
      page: raw?.page,
      perPage: raw?.per_page,
      totalPages: raw?.total_pages,
      totalRecords: raw?.total_records,
      cursor: raw?.cursor
    };
  }

  private buildParams(params?: ListParams): Record<string, string> {
    if (!params) return {};

    for (let [name, value, max] of [
      ['page', params.page, Number.MAX_SAFE_INTEGER],
      ['perPage', params.perPage, 100]
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1 || value > max)) {
        throw createApiServiceError(`${name} must be a whole number from 1 to ${max}.`);
      }
    }
    let result: Record<string, string> = {};

    if (params.page !== undefined) result.page = String(params.page);
    if (params.perPage !== undefined) result.per_page = String(params.perPage);
    if (params.sort) result.sort = params.sort;
    if (params.cursor) result.cursor = params.cursor;
    if (params.includes && params.includes.length > 0) {
      result.includes = params.includes.join(',');
    }
    if (params.updatedAfter) result.updated_after = params.updatedAfter;
    if (params.updatedBefore) result.updated_before = params.updatedBefore;

    for (let [key, value] of Object.entries(params)) {
      if (
        [
          'page',
          'perPage',
          'sort',
          'cursor',
          'includes',
          'updatedAfter',
          'updatedBefore'
        ].includes(key)
      )
        continue;
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }

    return result;
  }

  // Suggestions
  async listSuggestions(
    params?: ListParams
  ): Promise<{ suggestions?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/suggestions', { params: this.buildParams(params) });
    return {
      suggestions: response.data?.suggestions,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getSuggestion(suggestionId: number, includes?: string[]): Promise<any> {
    let p: Record<string, string> = {};
    if (includes && includes.length > 0) p.includes = includes.join(',');
    let response = await this.http.get(`/suggestions/${suggestionId}`, { params: p });
    return this.firstRecord(response.data, 'suggestions');
  }

  async createSuggestion(data: {
    title: string;
    body?: string;
    forumId: number;
    categoryId?: number;
    labelIds?: number[];
  }): Promise<any> {
    let payload: Record<string, any> = {
      title: data.title,
      links: { forum: data.forumId }
    };
    if (data.body !== undefined) payload.body = data.body;
    if (data.categoryId !== undefined) payload.links.category = data.categoryId;
    if (data.labelIds !== undefined) payload.links.labels = data.labelIds;

    let response = await this.http.post('/suggestions', payload);
    return this.firstRecord(response.data, 'suggestions');
  }

  async updateSuggestion(
    suggestionId: number,
    data: {
      title?: string;
      body?: string;
      categoryId?: number | null;
      labelIds?: number[];
      statusId?: number;
    }
  ): Promise<any> {
    let payload: Record<string, any> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.body !== undefined) payload.body = data.body;

    let links: Record<string, any> = {};
    if (data.categoryId !== undefined) links.category = data.categoryId;
    if (data.labelIds !== undefined) links.labels = data.labelIds;
    if (data.statusId !== undefined) links.status = data.statusId;
    if (Object.keys(links).length > 0) payload.links = links;

    let response = await this.http.put(`/suggestions/${suggestionId}`, payload);
    return this.firstRecord(response.data, 'suggestions');
  }

  async deleteSuggestion(suggestionId: number): Promise<void> {
    await this.http.delete(`/suggestions/${suggestionId}`);
  }

  // Status Updates
  async createStatusUpdate(
    suggestionId: number,
    data: {
      statusId: number;
      body?: string;
      notifySupporters?: boolean;
    }
  ): Promise<any> {
    let payload: Record<string, any> = {
      links: {
        suggestion: suggestionId,
        status: data.statusId
      }
    };
    if (data.body !== undefined) payload.body = data.body;
    if (data.notifySupporters !== undefined) payload.notify_supporters = data.notifySupporters;

    let response = await this.http.post('/status_updates', payload);
    return this.firstRecord(response.data, 'status_updates');
  }

  async listStatusUpdates(
    params?: ListParams
  ): Promise<{ statusUpdates?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/status_updates', {
      params: this.buildParams(params)
    });
    return {
      statusUpdates: response.data?.status_updates,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Forums
  async listForums(
    params?: ListParams
  ): Promise<{ forums?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/forums', { params: this.buildParams(params) });
    return {
      forums: response.data?.forums,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getForum(forumId: number): Promise<any> {
    let response = await this.http.get(`/forums/${forumId}`);
    return this.firstRecord(response.data, 'forums');
  }

  async createForum(data: {
    name: string;
    welcomeMessage?: string;
    prompt?: string;
    isPublic?: boolean;
  }): Promise<any> {
    let payload: Record<string, any> = { name: data.name };
    if (data.welcomeMessage !== undefined) payload.welcome_message = data.welcomeMessage;
    if (data.prompt !== undefined) payload.prompt = data.prompt;
    if (data.isPublic !== undefined) payload.is_public = data.isPublic;

    let response = await this.http.post('/forums', payload);
    return this.firstRecord(response.data, 'forums');
  }

  async updateForum(
    forumId: number,
    data: {
      name?: string;
      welcomeMessage?: string;
      prompt?: string;
      isPublic?: boolean;
    }
  ): Promise<any> {
    let payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.welcomeMessage !== undefined) payload.welcome_message = data.welcomeMessage;
    if (data.prompt !== undefined) payload.prompt = data.prompt;
    if (data.isPublic !== undefined) payload.is_public = data.isPublic;

    let response = await this.http.put(`/forums/${forumId}`, payload);
    return this.firstRecord(response.data, 'forums');
  }

  // Users
  async listUsers(
    params?: ListParams
  ): Promise<{ users?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/users', { params: this.buildParams(params) });
    return {
      users: response.data?.users,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return this.firstRecord(response.data, 'users');
  }

  async getCurrentUser(): Promise<any> {
    let response = await this.http.get('/users/current');
    return this.firstRecord(response.data, 'users');
  }

  async listNotes(
    params?: ListParams
  ): Promise<{ notes?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/notes', { params: this.buildParams(params) });
    return {
      notes: response.data?.notes,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Supporters
  async listSupporters(
    params?: ListParams
  ): Promise<{ supporters?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/supporters', { params: this.buildParams(params) });
    return {
      supporters: response.data?.supporters,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async createSupporter(data: { suggestionId: number; userId?: number }): Promise<any> {
    let payload: Record<string, any> = {
      links: { suggestion: data.suggestionId }
    };
    if (data.userId !== undefined) payload.links.user = data.userId;

    let response = await this.http.post('/supporters', payload);
    return this.firstRecord(response.data, 'supporters');
  }

  async deleteSupporter(supporterId: number): Promise<void> {
    await this.http.delete(`/supporters/${supporterId}`);
  }

  // Labels
  async listLabels(
    params?: ListParams
  ): Promise<{ labels?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/labels', { params: this.buildParams(params) });
    return {
      labels: response.data?.labels,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async createLabel(name: string): Promise<any> {
    let response = await this.http.post('/labels', { name });
    return this.firstRecord(response.data, 'labels');
  }

  // Categories
  async listCategories(
    params?: ListParams
  ): Promise<{ categories?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/categories', { params: this.buildParams(params) });
    return {
      categories: response.data?.categories,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async createCategory(name: string, forumId: number): Promise<any> {
    let response = await this.http.post('/categories', {
      name,
      links: { forum: forumId }
    });
    return this.firstRecord(response.data, 'categories');
  }

  // Statuses
  async listStatuses(
    params?: ListParams
  ): Promise<{ statuses?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/statuses', { params: this.buildParams(params) });
    return {
      statuses: response.data?.statuses,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Comments
  async listComments(
    params?: ListParams
  ): Promise<{ comments?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/comments', { params: this.buildParams(params) });
    return {
      comments: response.data?.comments,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // NPS Ratings
  async listNpsRatings(
    params?: ListParams
  ): Promise<{ npsRatings?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/nps_ratings', { params: this.buildParams(params) });
    return {
      npsRatings: response.data?.nps_ratings,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Features
  async listFeatures(
    params?: ListParams
  ): Promise<{ features?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/features', { params: this.buildParams(params) });
    return {
      features: response.data?.features,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getFeature(featureId: number): Promise<any> {
    let response = await this.http.get(`/features/${featureId}`);
    return this.firstRecord(response.data, 'features');
  }

  // Teams
  async listTeams(
    params?: ListParams
  ): Promise<{ teams?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/teams', { params: this.buildParams(params) });
    return {
      teams: response.data?.teams,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // External Users Import
  async importExternalUsers(users: any[]): Promise<any> {
    let response = await this.http.post('/external_users/import', { users });
    return response.data;
  }

  // External Accounts
  async listExternalAccounts(
    params?: ListParams
  ): Promise<{ externalAccounts?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/external_accounts', {
      params: this.buildParams(params)
    });
    return {
      externalAccounts: response.data?.external_accounts,
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Notes
  async createNote(suggestionId: number, body: string): Promise<any> {
    let response = await this.http.post('/notes', {
      body,
      links: { suggestion: suggestionId }
    });
    return this.firstRecord(response.data, 'notes');
  }

  // Segments
  async listSegments(
    params?: ListParams
  ): Promise<{ segments?: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/segments', { params: this.buildParams(params) });
    return {
      segments: response.data?.segments,
      pagination: this.mapPagination(response.data.pagination)
    };
  }
}
