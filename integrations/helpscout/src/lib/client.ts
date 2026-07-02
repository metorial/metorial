import { createAxios } from 'slates';

export class HelpScoutClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.helpscout.net/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Conversations ──────────────────────────────────────────

  async listConversations(
    params: {
      mailbox?: number;
      status?: string;
      tag?: string;
      assignedTo?: number;
      modifiedSince?: string;
      sortField?: string;
      sortOrder?: string;
      page?: number;
      query?: string;
    } = {}
  ) {
    if (params.query) {
      let response = await this.http.get('/conversations', {
        params: {
          query: params.query,
          page: params.page,
          sortField: params.sortField,
          sortOrder: params.sortOrder
        }
      });
      return response.data;
    }

    let queryParts: string[] = [];
    if (params.mailbox) queryParts.push(`mailbox:${params.mailbox}`);
    if (params.status) queryParts.push(`status:${params.status}`);
    if (params.tag) queryParts.push(`tag:"${params.tag}"`);
    if (params.assignedTo) queryParts.push(`assigned:${params.assignedTo}`);
    if (params.modifiedSince) queryParts.push(`modifiedSince:${params.modifiedSince}`);

    let requestParams: Record<string, any> = {
      page: params.page,
      sortField: params.sortField,
      sortOrder: params.sortOrder
    };

    if (queryParts.length > 0) {
      requestParams.query = `(${queryParts.join(' AND ')})`;
    }

    let response = await this.http.get('/conversations', { params: requestParams });
    return response.data;
  }

  async getConversation(conversationId: number) {
    let response = await this.http.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async createConversation(data: {
    subject: string;
    type: string;
    mailboxId: number;
    customer: { email?: string; id?: number };
    threads: Array<{
      type: string;
      text: string;
      customer?: { email?: string; id?: number };
    }>;
    tags?: string[];
    status?: string;
    assignTo?: number;
    autoReply?: boolean;
  }) {
    let body: Record<string, any> = {
      subject: data.subject,
      type: data.type,
      mailboxId: data.mailboxId,
      customer: data.customer,
      threads: data.threads,
      status: data.status ?? 'active',
      autoReply: data.autoReply
    };
    if (data.tags) body.tags = data.tags;
    if (data.assignTo) body.assignTo = data.assignTo;

    let response = await this.http.post('/conversations', body);
    let location = response.headers?.['resource-id'] ?? response.headers?.location;
    return { conversationId: location };
  }

  async updateConversation(
    conversationId: number,
    operations: Array<{
      op: string;
      path: string;
      value: any;
    }>
  ) {
    await this.http.patch(`/conversations/${conversationId}`, operations, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async deleteConversation(conversationId: number) {
    await this.http.delete(`/conversations/${conversationId}`);
  }

  async updateConversationStatus(conversationId: number, status: string) {
    await this.http.put(`/conversations/${conversationId}/status`, {
      status,
      op: 'replace',
      path: '/status'
    });
  }

  async assignConversation(conversationId: number, assignTo: number) {
    await this.http.put(`/conversations/${conversationId}/assignee`, {
      assignTo,
      op: 'replace',
      path: '/assignTo'
    });
  }

  async updateConversationTags(conversationId: number, tags: string[]) {
    await this.http.put(`/conversations/${conversationId}/tags`, { tags });
  }

  async updateConversationCustomFields(
    conversationId: number,
    fields: Array<{ id: number; value: string }>
  ) {
    await this.http.put(`/conversations/${conversationId}/fields`, { fields });
  }

  // ─── Threads ─────────────────────────────────────────────────

  async listThreads(conversationId: number) {
    let response = await this.http.get(`/conversations/${conversationId}/threads`);
    return response.data;
  }

  async createReply(
    conversationId: number,
    data: {
      text: string;
      customer: { email?: string; id?: number };
      draft?: boolean;
      status?: string;
      attachments?: Array<{ fileName: string; mimeType: string; data: string }>;
    }
  ) {
    await this.http.post(`/conversations/${conversationId}/reply`, {
      text: data.text,
      customer: data.customer,
      draft: data.draft ?? false,
      status: data.status,
      attachments: data.attachments
    });
  }

  async createNote(
    conversationId: number,
    data: {
      text: string;
      attachments?: Array<{ fileName: string; mimeType: string; data: string }>;
    }
  ) {
    await this.http.post(`/conversations/${conversationId}/notes`, {
      text: data.text,
      attachments: data.attachments
    });
  }

  async createPhoneThread(
    conversationId: number,
    data: {
      text: string;
      customer: { email?: string; id?: number };
    }
  ) {
    await this.http.post(`/conversations/${conversationId}/phones`, {
      text: data.text,
      customer: data.customer
    });
  }

  // ─── Customers ──────────────────────────────────────────────

  async listCustomers(
    params: {
      mailbox?: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      query?: string;
      page?: number;
      sortField?: string;
      sortOrder?: string;
    } = {}
  ) {
    if (params.query) {
      let response = await this.http.get('/customers', {
        params: {
          query: params.query,
          page: params.page,
          sortField: params.sortField,
          sortOrder: params.sortOrder
        }
      });
      return response.data;
    }

    let queryParts: string[] = [];
    if (params.firstName) queryParts.push(`firstName:"${params.firstName}"`);
    if (params.lastName) queryParts.push(`lastName:"${params.lastName}"`);
    if (params.email) queryParts.push(`email:"${params.email}"`);
    if (params.mailbox) queryParts.push(`mailbox:${params.mailbox}`);

    let requestParams: Record<string, any> = {
      page: params.page,
      sortField: params.sortField,
      sortOrder: params.sortOrder
    };

    if (queryParts.length > 0) {
      requestParams.query = `(${queryParts.join(' AND ')})`;
    }

    let response = await this.http.get('/customers', { params: requestParams });
    return response.data;
  }

  async getCustomer(customerId: number) {
    let response = await this.http.get(`/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(data: {
    firstName?: string;
    lastName?: string;
    emails?: Array<{ type: string; value: string }>;
    phones?: Array<{ type: string; value: string }>;
    organization?: string;
    jobTitle?: string;
    background?: string;
  }) {
    let response = await this.http.post('/customers', data);
    let location = response.headers?.['resource-id'] ?? response.headers?.location;
    return { customerId: location };
  }

  async updateCustomer(
    customerId: number,
    data: {
      firstName?: string;
      lastName?: string;
      organization?: string;
      jobTitle?: string;
      background?: string;
    }
  ) {
    await this.http.put(`/customers/${customerId}`, data);
  }

  async deleteCustomer(customerId: number) {
    await this.http.delete(`/customers/${customerId}`);
  }

  async createCustomerEmail(customerId: number, email: { type: string; value: string }) {
    await this.http.post(`/customers/${customerId}/emails`, email);
  }

  async deleteCustomerEmail(customerId: number, emailId: number) {
    await this.http.delete(`/customers/${customerId}/emails/${emailId}`);
  }

  async createCustomerPhone(customerId: number, phone: { type: string; value: string }) {
    await this.http.post(`/customers/${customerId}/phones`, phone);
  }

  async deleteCustomerPhone(customerId: number, phoneId: number) {
    await this.http.delete(`/customers/${customerId}/phones/${phoneId}`);
  }

  // ─── Organizations ─────────────────────────────────────────

  async listOrganizations(params: { page?: number } = {}) {
    let response = await this.http.get('/organizations', { params });
    return response.data;
  }

  async getOrganization(organizationId: number) {
    let response = await this.http.get(`/organizations/${organizationId}`);
    return response.data;
  }

  async createOrganization(data: { name: string }) {
    let response = await this.http.post('/organizations', data);
    let location = response.headers?.['resource-id'] ?? response.headers?.location;
    return { organizationId: location };
  }

  async updateOrganization(organizationId: number, data: { name?: string }) {
    await this.http.put(`/organizations/${organizationId}`, data);
  }

  async deleteOrganization(organizationId: number) {
    await this.http.delete(`/organizations/${organizationId}`);
  }

  // ─── Mailboxes ──────────────────────────────────────────────

  async listMailboxes(params: { page?: number } = {}) {
    let response = await this.http.get('/mailboxes', { params });
    return response.data;
  }

  async getMailbox(mailboxId: number) {
    let response = await this.http.get(`/mailboxes/${mailboxId}`);
    return response.data;
  }

  async listMailboxFolders(mailboxId: number) {
    let response = await this.http.get(`/mailboxes/${mailboxId}/folders`);
    return response.data;
  }

  async listMailboxCustomFields(mailboxId: number) {
    let response = await this.http.get(`/mailboxes/${mailboxId}/fields`);
    return response.data;
  }

  // ─── Tags ───────────────────────────────────────────────────

  async listTags(params: { page?: number } = {}) {
    let response = await this.http.get('/tags', { params });
    return response.data;
  }

  async createTag(name: string) {
    await this.http.post('/tags', { name });
  }

  async updateTag(tagId: number, name: string) {
    await this.http.put(`/tags/${tagId}`, { name });
  }

  async deleteTag(tagId: number) {
    await this.http.delete(`/tags/${tagId}`);
  }

  // ─── Teams ──────────────────────────────────────────────────

  async listTeams(params: { page?: number } = {}) {
    let response = await this.http.get('/teams', { params });
    return response.data;
  }

  async listTeamMembers(teamId: number, params: { page?: number } = {}) {
    let response = await this.http.get(`/teams/${teamId}/members`, { params });
    return response.data;
  }

  // ─── Users ──────────────────────────────────────────────────

  async listUsers(params: { page?: number } = {}) {
    let response = await this.http.get('/users', { params });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async getAuthenticatedUser() {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  // ─── Workflows ──────────────────────────────────────────────

  async listWorkflows(params: { page?: number } = {}) {
    let response = await this.http.get('/workflows', { params });
    return response.data;
  }

  async activateWorkflow(workflowId: number) {
    await this.http.patch(`/workflows/${workflowId}/activate`);
  }

  async deactivateWorkflow(workflowId: number) {
    await this.http.patch(`/workflows/${workflowId}/deactivate`);
  }

  async runWorkflowOnConversations(workflowId: number, conversationIds: number[]) {
    await this.http.post(`/workflows/${workflowId}/run`, { conversationIds });
  }

  // ─── Webhooks ───────────────────────────────────────────────

  async listWebhooks(params: { page?: number } = {}) {
    let response = await this.http.get('/webhooks', { params });
    return response.data;
  }

  async getWebhook(webhookId: number) {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    events: string[];
    secret: string;
    payloadVersion?: string;
  }) {
    let response = await this.http.post('/webhooks', {
      url: data.url,
      events: data.events,
      secret: data.secret,
      payloadVersion: data.payloadVersion ?? 'V2'
    });
    let location = response.headers?.['resource-id'] ?? response.headers?.location;
    return { webhookId: location };
  }

  async updateWebhook(
    webhookId: number,
    data: {
      url?: string;
      events?: string[];
      secret?: string;
    }
  ) {
    await this.http.put(`/webhooks/${webhookId}`, data);
  }

  async deleteWebhook(webhookId: number) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  // ─── Reports ────────────────────────────────────────────────

  async getCompanyReport(params: {
    start: string;
    end: string;
    previousStart?: string;
    previousEnd?: string;
    mailboxes?: string;
    tags?: string;
    types?: string;
    folders?: string;
  }) {
    let response = await this.http.get('/reports/company', { params });
    return response.data;
  }

  async getConversationsReport(params: {
    start: string;
    end: string;
    previousStart?: string;
    previousEnd?: string;
    mailboxes?: string;
    tags?: string;
    types?: string;
    folders?: string;
  }) {
    let response = await this.http.get('/reports/conversations', { params });
    return response.data;
  }

  async getHappinessReport(params: {
    start: string;
    end: string;
    previousStart?: string;
    previousEnd?: string;
    mailboxes?: string;
    tags?: string;
    types?: string;
    folders?: string;
  }) {
    let response = await this.http.get('/reports/happiness', { params });
    return response.data;
  }

  // ─── Satisfaction Ratings ───────────────────────────────────

  async listSatisfactionRatings(
    params: {
      mailbox?: number;
      start?: string;
      end?: string;
      page?: number;
      sortField?: string;
      sortOrder?: string;
    } = {}
  ) {
    let response = await this.http.get('/ratings', { params });
    return response.data;
  }
}
