import { createAxios } from '@slates/provider';
import { zendeskApiError } from './errors';

export interface ZendeskClientConfig {
  subdomain: string;
  token: string;
  tokenType?: 'bearer' | 'basic';
}

export class ZendeskClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ZendeskClientConfig) {
    let authHeader =
      config.tokenType === 'basic' ? `Basic ${config.token}` : `Bearer ${config.token}`;

    this.http = createAxios({
      baseURL: `https://${config.subdomain}.zendesk.com/api/v2`,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(zendeskApiError(error))
    );
  }

  // ── Tickets ──────────────────────────────────────────────

  async listTickets(params?: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/tickets.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  async getTicket(ticketId: string) {
    let response = await this.http.get(`/tickets/${ticketId}.json`);
    return response.data.ticket;
  }

  async createTicket(ticket: Record<string, any>) {
    let response = await this.http.post('/tickets.json', { ticket });
    return response.data.ticket;
  }

  async updateTicket(ticketId: string, ticket: Record<string, any>) {
    let response = await this.http.put(`/tickets/${ticketId}.json`, { ticket });
    return response.data.ticket;
  }

  async deleteTicket(ticketId: string) {
    await this.http.delete(`/tickets/${ticketId}.json`);
  }

  async getTicketComments(
    ticketId: string,
    params?: {
      page?: number;
      perPage?: number;
      sortOrder?: 'asc' | 'desc';
      includeUsers?: boolean;
      includeInlineImages?: boolean;
    }
  ) {
    let response = await this.http.get(`/tickets/${ticketId}/comments.json`, {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort_order: params?.sortOrder,
        include: params?.includeUsers ? 'users' : undefined,
        include_inline_images: params?.includeInlineImages
      }
    });
    return response.data;
  }

  // ── Users ────────────────────────────────────────────────

  async listUsers(params?: { page?: number; perPage?: number; role?: string }) {
    let response = await this.http.get('/users.json', {
      params: { page: params?.page, per_page: params?.perPage, role: params?.role }
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${userId}.json`);
    return response.data.user;
  }

  async createUser(user: Record<string, any>) {
    let response = await this.http.post('/users.json', { user });
    return response.data.user;
  }

  async updateUser(userId: string, user: Record<string, any>) {
    let response = await this.http.put(`/users/${userId}.json`, { user });
    return response.data.user;
  }

  async deleteUser(userId: string) {
    await this.http.delete(`/users/${userId}.json`);
  }

  async getCurrentUser() {
    let response = await this.http.get('/users/me.json');
    return response.data.user;
  }

  async searchUsers(query: string) {
    let response = await this.http.get('/users/search.json', { params: { query } });
    return response.data;
  }

  // ── Organizations ────────────────────────────────────────

  async listOrganizations(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get('/organizations.json', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getOrganization(orgId: string) {
    let response = await this.http.get(`/organizations/${orgId}.json`);
    return response.data.organization;
  }

  async createOrganization(organization: Record<string, any>) {
    let response = await this.http.post('/organizations.json', { organization });
    return response.data.organization;
  }

  async updateOrganization(orgId: string, organization: Record<string, any>) {
    let response = await this.http.put(`/organizations/${orgId}.json`, { organization });
    return response.data.organization;
  }

  async deleteOrganization(orgId: string) {
    await this.http.delete(`/organizations/${orgId}.json`);
  }

  // ── Search ───────────────────────────────────────────────

  async search(
    query: string,
    params?: { page?: number; perPage?: number; sortBy?: string; sortOrder?: string }
  ) {
    let response = await this.http.get('/search.json', {
      params: {
        query,
        page: params?.page,
        per_page: params?.perPage,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  // ── Help Center (Articles) ──────────────────────────────

  async listArticles(params?: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: string;
    locale?: string;
  }) {
    let response = await this.http.get('/help_center/articles.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        locale: params?.locale
      }
    });
    return response.data;
  }

  async getArticle(articleId: string, locale?: string) {
    let path = locale
      ? `/help_center/${locale}/articles/${articleId}.json`
      : `/help_center/articles/${articleId}.json`;
    let response = await this.http.get(path);
    return response.data.article;
  }

  async createArticle(sectionId: string, article: Record<string, any>) {
    let response = await this.http.post(`/help_center/sections/${sectionId}/articles.json`, {
      article
    });
    return response.data.article;
  }

  async updateArticle(articleId: string, article: Record<string, any>) {
    let response = await this.http.put(`/help_center/articles/${articleId}.json`, { article });
    return response.data.article;
  }

  async deleteArticle(articleId: string) {
    await this.http.delete(`/help_center/articles/${articleId}.json`);
  }

  async listSections(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get('/help_center/sections.json', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async listCategories(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get('/help_center/categories.json', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ── Groups ───────────────────────────────────────────────

  async listGroups() {
    let response = await this.http.get('/groups.json');
    return response.data;
  }

  // ── Tags ─────────────────────────────────────────────────

  async listTags() {
    let response = await this.http.get('/tags.json');
    return response.data;
  }

  // ── Triggers ─────────────────────────────────────────────

  async listTriggers(params?: { page?: number; perPage?: number; active?: boolean }) {
    let response = await this.http.get('/triggers.json', {
      params: { page: params?.page, per_page: params?.perPage, active: params?.active }
    });
    return response.data;
  }

  // ── Automations ──────────────────────────────────────────

  async listAutomations(params?: { page?: number; perPage?: number; active?: boolean }) {
    let response = await this.http.get('/automations.json', {
      params: { page: params?.page, per_page: params?.perPage, active: params?.active }
    });
    return response.data;
  }

  // ── Macros ───────────────────────────────────────────────

  async listMacros(params?: {
    page?: number;
    perPage?: number;
    active?: boolean;
    access?: 'personal' | 'agents' | 'shared' | 'account';
    categoryId?: string;
    groupId?: string;
    onlyViewable?: boolean;
    sortBy?:
      | 'alphabetical'
      | 'created_at'
      | 'updated_at'
      | 'usage_1h'
      | 'usage_24h'
      | 'usage_7d'
      | 'usage_30d';
    sortOrder?: 'asc' | 'desc';
  }) {
    let response = await this.http.get('/macros.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        active: params?.active,
        access: params?.access,
        category: params?.categoryId,
        group_id: params?.groupId,
        only_viewable: params?.onlyViewable,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  // ── Views ────────────────────────────────────────────────

  async listViews(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get('/views.json', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getViewTickets(viewId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/views/${viewId}/tickets.json`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ── Webhooks ─────────────────────────────────────────────

  async createWebhook(webhook: Record<string, any>) {
    let response = await this.http.post('/webhooks', { webhook });
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data.webhook;
  }

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  // ── Incremental Exports (for polling) ────────────────────

  async getIncrementalTickets(startTime: number) {
    let response = await this.http.get('/incremental/tickets.json', {
      params: { start_time: startTime }
    });
    return response.data;
  }

  async getIncrementalUsers(startTime: number) {
    let response = await this.http.get('/incremental/users.json', {
      params: { start_time: startTime }
    });
    return response.data;
  }

  async getIncrementalOrganizations(startTime: number) {
    let response = await this.http.get('/incremental/organizations.json', {
      params: { start_time: startTime }
    });
    return response.data;
  }

  // ── SLA Policies ─────────────────────────────────────────

  async listSlaPolicies() {
    let response = await this.http.get('/slas/policies.json');
    return response.data;
  }

  // ── Custom Objects ───────────────────────────────────────

  async listCustomObjects() {
    let response = await this.http.get('/custom_objects');
    return response.data;
  }

  async getCustomObjectRecords(
    customObjectKey: string,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.http.get(`/custom_objects/${customObjectKey}/records`, {
      params: { 'page[size]': params?.perPage }
    });
    return response.data;
  }

  async createCustomObjectRecord(customObjectKey: string, record: Record<string, any>) {
    let response = await this.http.post(`/custom_objects/${customObjectKey}/records`, {
      custom_object_record: record
    });
    return response.data.custom_object_record;
  }

  // ── Ticket Fields ────────────────────────────────────────

  async listTicketFields(params?: {
    creator?: boolean;
    locale?: string;
    sort?: string;
    pageSize?: number;
    pageAfter?: string;
    pageBefore?: string;
  }) {
    let response = await this.http.get('/ticket_fields.json', {
      params: {
        creator: params?.creator,
        locale: params?.locale,
        sort: params?.sort,
        'page[size]': params?.pageSize,
        'page[after]': params?.pageAfter,
        'page[before]': params?.pageBefore
      }
    });
    return response.data;
  }

  // ── Satisfaction Ratings ─────────────────────────────────

  async listSatisfactionRatings(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get('/satisfaction_ratings.json', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }
}
