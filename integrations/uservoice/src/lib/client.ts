import { createAxios } from 'slates';

export interface PaginationResult {
  page: number;
  perPage: number;
  totalPages: number;
  totalRecords: number;
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
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; subdomain: string }) {
    this.http = createAxios({
      baseURL: `https://${config.subdomain}.uservoice.com/api/v2/admin`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private mapPagination(raw: any): PaginationResult {
    return {
      page: raw?.page || 1,
      perPage: raw?.per_page || 20,
      totalPages: raw?.total_pages || 0,
      totalRecords: raw?.total_records || 0,
      cursor: raw?.cursor
    };
  }

  private buildParams(params?: ListParams): Record<string, string> {
    if (!params) return {};

    let result: Record<string, string> = {};

    if (params.page) result.page = String(params.page);
    if (params.perPage) result.per_page = String(params.perPage);
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
  ): Promise<{ suggestions: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/suggestions', { params: this.buildParams(params) });
    return {
      suggestions: response.data.suggestions || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getSuggestion(suggestionId: number, includes?: string[]): Promise<any> {
    let p: Record<string, string> = {};
    if (includes && includes.length > 0) p.includes = includes.join(',');
    let response = await this.http.get(`/suggestions/${suggestionId}`, { params: p });
    return response.data.suggestions?.[0];
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
    if (data.body) payload.body = data.body;
    if (data.categoryId) payload.links.category = data.categoryId;
    if (data.labelIds && data.labelIds.length > 0) payload.links.labels = data.labelIds;

    let response = await this.http.post('/suggestions', payload);
    return response.data.suggestions?.[0];
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
    return response.data.suggestions?.[0];
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
        new_status: data.statusId
      }
    };
    if (data.body) payload.body = data.body;
    if (data.notifySupporters !== undefined)
      payload.notify_subscribers = data.notifySupporters;

    let response = await this.http.post('/status_updates', payload);
    return response.data.status_updates?.[0];
  }

  async listStatusUpdates(
    params?: ListParams
  ): Promise<{ statusUpdates: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/status_updates', {
      params: this.buildParams(params)
    });
    return {
      statusUpdates: response.data.status_updates || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Forums
  async listForums(
    params?: ListParams
  ): Promise<{ forums: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/forums', { params: this.buildParams(params) });
    return {
      forums: response.data.forums || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getForum(forumId: number): Promise<any> {
    let response = await this.http.get(`/forums/${forumId}`);
    return response.data.forums?.[0];
  }

  async createForum(data: {
    name: string;
    welcomeMessage?: string;
    prompt?: string;
    isPublic?: boolean;
  }): Promise<any> {
    let payload: Record<string, any> = { name: data.name };
    if (data.welcomeMessage) payload.welcome_message = data.welcomeMessage;
    if (data.prompt) payload.prompt = data.prompt;
    if (data.isPublic !== undefined) payload.is_public = data.isPublic;

    let response = await this.http.post('/forums', payload);
    return response.data.forums?.[0];
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
    return response.data.forums?.[0];
  }

  // Users
  async listUsers(
    params?: ListParams
  ): Promise<{ users: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/users', { params: this.buildParams(params) });
    return {
      users: response.data.users || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data.users?.[0];
  }

  // Supporters
  async listSupporters(
    params?: ListParams
  ): Promise<{ supporters: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/supporters', { params: this.buildParams(params) });
    return {
      supporters: response.data.supporters || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async createSupporter(data: { suggestionId: number; userId?: number }): Promise<any> {
    let payload: Record<string, any> = {
      links: { suggestion: data.suggestionId }
    };
    if (data.userId) payload.links.user = data.userId;

    let response = await this.http.post('/supporters', payload);
    return response.data.supporters?.[0];
  }

  async deleteSupporter(supporterId: number): Promise<void> {
    await this.http.delete(`/supporters/${supporterId}`);
  }

  // Labels
  async listLabels(
    params?: ListParams
  ): Promise<{ labels: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/labels', { params: this.buildParams(params) });
    return {
      labels: response.data.labels || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async createLabel(name: string): Promise<any> {
    let response = await this.http.post('/labels', { name });
    return response.data.labels?.[0];
  }

  // Categories
  async listCategories(
    params?: ListParams
  ): Promise<{ categories: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/categories', { params: this.buildParams(params) });
    return {
      categories: response.data.categories || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async createCategory(name: string, forumId: number): Promise<any> {
    let response = await this.http.post('/categories', {
      name,
      links: { forum: forumId }
    });
    return response.data.categories?.[0];
  }

  // Statuses
  async listStatuses(
    params?: ListParams
  ): Promise<{ statuses: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/statuses', { params: this.buildParams(params) });
    return {
      statuses: response.data.statuses || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Comments
  async listComments(
    params?: ListParams
  ): Promise<{ comments: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/comments', { params: this.buildParams(params) });
    return {
      comments: response.data.comments || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // NPS Ratings
  async listNpsRatings(
    params?: ListParams
  ): Promise<{ npsRatings: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/nps_ratings', { params: this.buildParams(params) });
    return {
      npsRatings: response.data.nps_ratings || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Features
  async listFeatures(
    params?: ListParams
  ): Promise<{ features: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/features', { params: this.buildParams(params) });
    return {
      features: response.data.features || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  async getFeature(featureId: number): Promise<any> {
    let response = await this.http.get(`/features/${featureId}`);
    return response.data.features?.[0];
  }

  // Teams
  async listTeams(
    params?: ListParams
  ): Promise<{ teams: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/teams', { params: this.buildParams(params) });
    return {
      teams: response.data.teams || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // External Users Import
  async importExternalUsers(users: any[]): Promise<any> {
    let response = await this.http.post('/external_users/import', { external_users: users });
    return response.data;
  }

  // External Accounts
  async listExternalAccounts(
    params?: ListParams
  ): Promise<{ externalAccounts: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/external_accounts', {
      params: this.buildParams(params)
    });
    return {
      externalAccounts: response.data.external_accounts || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }

  // Notes
  async createNote(suggestionId: number, body: string): Promise<any> {
    let response = await this.http.post('/notes', {
      body,
      links: { suggestion: suggestionId }
    });
    return response.data.notes?.[0];
  }

  // Segments
  async listSegments(
    params?: ListParams
  ): Promise<{ segments: any[]; pagination: PaginationResult }> {
    let response = await this.http.get('/segments', { params: this.buildParams(params) });
    return {
      segments: response.data.segments || [],
      pagination: this.mapPagination(response.data.pagination)
    };
  }
}
