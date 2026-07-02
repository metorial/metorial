import { createAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    paging: {
      perPage: number;
      currentPage: number;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.salesloft.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ── People ──

  async listPeople(
    params?: PaginationParams & {
      emailAddresses?: string[];
      tagId?: number;
      cadenceId?: number;
      accountId?: number;
      ownerId?: number;
      updatedAtGte?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.emailAddresses) queryParams['email_addresses[]'] = params.emailAddresses;
    if (params?.tagId) queryParams.tag_id = params.tagId;
    if (params?.cadenceId) queryParams.cadence_id = params.cadenceId;
    if (params?.accountId) queryParams.account_id = params.accountId;
    if (params?.ownerId) queryParams.owner_id = params.ownerId;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;

    let response = await this.axios.get('/people.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getPerson(personId: number): Promise<any> {
    let response = await this.axios.get(`/people/${personId}.json`);
    return response.data.data;
  }

  async createPerson(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/people.json', data);
    return response.data.data;
  }

  async updatePerson(personId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/people/${personId}.json`, data);
    return response.data.data;
  }

  async deletePerson(personId: number): Promise<void> {
    await this.axios.delete(`/people/${personId}.json`);
  }

  // ── Accounts ──

  async listAccounts(
    params?: PaginationParams & {
      domain?: string;
      name?: string;
      updatedAtGte?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.domain) queryParams.domain = params.domain;
    if (params?.name) queryParams.name = params.name;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;

    let response = await this.axios.get('/accounts.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getAccount(accountId: number): Promise<any> {
    let response = await this.axios.get(`/accounts/${accountId}.json`);
    return response.data.data;
  }

  async createAccount(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/accounts.json', data);
    return response.data.data;
  }

  async updateAccount(accountId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/accounts/${accountId}.json`, data);
    return response.data.data;
  }

  async deleteAccount(accountId: number): Promise<void> {
    await this.axios.delete(`/accounts/${accountId}.json`);
  }

  // ── Cadences ──

  async listCadences(
    params?: PaginationParams & {
      teamCadence?: boolean;
      updatedAtGte?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.teamCadence !== undefined) queryParams.team_cadence = params.teamCadence;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;

    let response = await this.axios.get('/cadences.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getCadence(cadenceId: number): Promise<any> {
    let response = await this.axios.get(`/cadences/${cadenceId}.json`);
    return response.data.data;
  }

  // ── Cadence Memberships ──

  async addPersonToCadence(
    personId: number,
    cadenceId: number,
    userId?: number
  ): Promise<any> {
    let body: Record<string, any> = {
      person_id: personId,
      cadence_id: cadenceId
    };
    if (userId) body.user_id = userId;
    let response = await this.axios.post('/cadence_memberships.json', body);
    return response.data.data;
  }

  async removeCadenceMembership(membershipId: number): Promise<void> {
    await this.axios.delete(`/cadence_memberships/${membershipId}.json`);
  }

  async listCadenceMemberships(
    params?: PaginationParams & {
      personId?: number;
      cadenceId?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.personId) queryParams.person_id = params.personId;
    if (params?.cadenceId) queryParams.cadence_id = params.cadenceId;

    let response = await this.axios.get('/cadence_memberships.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  // ── Activities: Emails ──

  async listEmailActivities(
    params?: PaginationParams & {
      updatedAtGte?: string;
      personId?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;
    if (params?.personId) queryParams.person_id = params.personId;

    let response = await this.axios.get('/activities/emails.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getEmailActivity(emailId: number): Promise<any> {
    let response = await this.axios.get(`/activities/emails/${emailId}.json`);
    return response.data.data;
  }

  // ── Activities: Calls ──

  async listCallActivities(
    params?: PaginationParams & {
      updatedAtGte?: string;
      personId?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;
    if (params?.personId) queryParams.person_id = params.personId;

    let response = await this.axios.get('/activities/calls.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getCallActivity(callId: number): Promise<any> {
    let response = await this.axios.get(`/activities/calls/${callId}.json`);
    return response.data.data;
  }

  // ── Calls ──

  async createCall(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/calls.json', data);
    return response.data.data;
  }

  // ── Email Templates ──

  async listEmailTemplates(
    params?: PaginationParams & {
      searchTitle?: string;
      searchSubject?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.searchTitle) queryParams['title[starts_with]'] = params.searchTitle;
    if (params?.searchSubject) queryParams['subject[starts_with]'] = params.searchSubject;

    let response = await this.axios.get('/email_templates.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getEmailTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(`/email_templates/${templateId}.json`);
    return response.data.data;
  }

  // ── Tasks ──

  async listTasks(
    params?: PaginationParams & {
      personId?: number;
      currentUser?: boolean;
      taskType?: string;
      updatedAtGte?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.personId) queryParams.person_id = params.personId;
    if (params?.currentUser) queryParams.current_user = params.currentUser;
    if (params?.taskType) queryParams.task_type = params.taskType;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;

    let response = await this.axios.get('/tasks.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getTask(taskId: number): Promise<any> {
    let response = await this.axios.get(`/tasks/${taskId}.json`);
    return response.data.data;
  }

  // ── Notes ──

  async listNotes(
    params?: PaginationParams & {
      personId?: number;
      accountId?: number;
      updatedAtGte?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.personId) queryParams.associated_with_id = params.personId;
    if (params?.updatedAtGte) queryParams['updated_at[gte]'] = params.updatedAtGte;

    let response = await this.axios.get('/notes.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async createNote(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/notes.json', data);
    return response.data.data;
  }

  async updateNote(noteId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/notes/${noteId}.json`, data);
    return response.data.data;
  }

  // ── Users ──

  async listUsers(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;

    let response = await this.axios.get('/users.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.axios.get(`/users/${userId}.json`);
    return response.data.data;
  }

  async getMe(): Promise<any> {
    let response = await this.axios.get('/me.json');
    return response.data.data;
  }

  // ── Tags ──

  async listTags(
    params?: PaginationParams & {
      search?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.search) queryParams.search = params.search;

    let response = await this.axios.get('/tags.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  // ── Webhook Subscriptions ──

  async createWebhookSubscription(callbackUrl: string, eventType: string): Promise<any> {
    let response = await this.axios.post('/webhook_subscriptions.json', {
      callback_url: callbackUrl,
      event_type: eventType
    });
    return response.data.data;
  }

  async deleteWebhookSubscription(subscriptionId: number): Promise<void> {
    await this.axios.delete(`/webhook_subscriptions/${subscriptionId}.json`);
  }

  async listWebhookSubscriptions(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;

    let response = await this.axios.get('/webhook_subscriptions.json', {
      params: queryParams
    });
    return this.mapPaginatedResponse(response.data);
  }

  // ── Conversations ──

  async listConversations(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;

    let response = await this.axios.get('/conversations.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  // ── Successes ──

  async listSuccesses(
    params?: PaginationParams & {
      personId?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.personId) queryParams.person_id = params.personId;

    let response = await this.axios.get('/successes.json', { params: queryParams });
    return this.mapPaginatedResponse(response.data);
  }

  // ── Helpers ──

  private mapPaginatedResponse(raw: any): PaginatedResponse<any> {
    return {
      data: raw.data || [],
      metadata: {
        paging: {
          perPage: raw.metadata?.paging?.per_page ?? 25,
          currentPage: raw.metadata?.paging?.current_page ?? 1,
          nextPage: raw.metadata?.paging?.next_page ?? null,
          prevPage: raw.metadata?.paging?.prev_page ?? null
        }
      }
    };
  }
}
