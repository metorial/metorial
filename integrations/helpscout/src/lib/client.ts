import { createAxios, getResponseHeaderValue } from 'slates';
import { withHelpScoutErrorHandling } from './errors';

let API_BASE_URL = 'https://api.helpscout.net/v2';

export type HelpScoutCustomerRef = { email?: string; id?: number };

export type HelpScoutThreadAttachment = {
  fileName: string;
  mimeType: string;
  data: string;
};

export type HelpScoutPatchOperation = {
  op: string;
  path: string;
  value?: unknown;
};

type ReportParams = {
  start: string;
  end: string;
  previousStart?: string;
  previousEnd?: string;
  mailboxes?: string;
  tags?: string;
  types?: string;
  folders?: string;
  officeHours?: boolean;
};

// Help Scout returns the new entity id in the Resource-ID header and the
// entity URL in the Location header.
// https://developer.helpscout.com/mailbox-api/endpoints/conversations/create/
let getCreatedResourceId = (headers: unknown): string | undefined => {
  let resourceId = getResponseHeaderValue(headers, 'resource-id');
  if (resourceId) return resourceId;

  let location = getResponseHeaderValue(headers, 'location');
  let match = location?.match(/\/(\d+)(?:[/?#]|$)/);
  return match?.[1];
};

export class HelpScoutClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = withHelpScoutErrorHandling(
      createAxios({
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      'Inbox API request'
    );
  }

  // ─── Conversations ──────────────────────────────────────────

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/list/
  async listConversations(
    params: {
      mailbox?: number;
      folder?: number;
      status?: string;
      tag?: string;
      assignedTo?: number;
      modifiedSince?: string;
      number?: number;
      sortField?: string;
      sortOrder?: string;
      page?: number;
      query?: string;
    } = {}
  ) {
    let response = await this.http.get('/conversations', {
      params: {
        mailbox: params.mailbox,
        folder: params.folder,
        status: params.status,
        tag: params.tag,
        assigned_to: params.assignedTo,
        modifiedSince: params.modifiedSince,
        number: params.number,
        query: params.query,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
        page: params.page
      }
    });
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
    customer: HelpScoutCustomerRef;
    threads: Array<{
      type: string;
      text: string;
      customer?: HelpScoutCustomerRef;
    }>;
    tags?: string[];
    status?: string;
    assignTo?: number | null;
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
    if (data.assignTo !== undefined) body.assignTo = data.assignTo;

    let response = await this.http.post('/conversations', body);
    return {
      conversationId: getCreatedResourceId(response.headers),
      webUrl: getResponseHeaderValue(response.headers, 'web-location')
    };
  }

  // The update endpoint accepts one JSON Patch operation per request.
  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/update/
  async patchConversation(conversationId: number, operation: HelpScoutPatchOperation) {
    await this.http.patch(`/conversations/${conversationId}`, operation);
  }

  async deleteConversation(conversationId: number) {
    await this.http.delete(`/conversations/${conversationId}`);
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/tags/update/
  async updateConversationTags(conversationId: number, tags: string[]) {
    await this.http.put(`/conversations/${conversationId}/tags`, { tags });
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/custom_fields/update/
  async updateConversationCustomFields(
    conversationId: number,
    fields: Array<{ id: number; value: string }>
  ) {
    await this.http.put(`/conversations/${conversationId}/fields`, { fields });
  }

  // ─── Threads ─────────────────────────────────────────────────

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/list/
  async listThreads(conversationId: number, params: { page?: number } = {}) {
    let response = await this.http.get(`/conversations/${conversationId}/threads`, {
      params
    });
    return response.data;
  }

  async listAllThreads(conversationId: number, maxPages = 10) {
    let threads: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      let data = await this.listThreads(conversationId, { page });
      threads.push(...(data?._embedded?.threads ?? []));
      totalPages = Number(data?.page?.totalPages ?? 1) || 1;
      page++;
    } while (page <= totalPages && page <= maxPages);

    return threads;
  }

  // Thread attachments are only exposed through each thread's
  // `_embedded.attachments`, so scan the conversation's threads for the metadata.
  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/list/
  async findThreadAttachment(conversationId: number, attachmentId: number, maxPages = 50) {
    let page = 1;
    let totalPages = 1;

    do {
      let data = await this.listThreads(conversationId, { page });
      for (let thread of data?._embedded?.threads ?? []) {
        let attachment = (thread?._embedded?.attachments ?? []).find(
          (candidate: any) => Number(candidate?.id) === attachmentId
        );
        if (attachment) return { threadId: thread.id as number, attachment };
      }
      totalPages = Number(data?.page?.totalPages ?? 1) || 1;
      page++;
    } while (page <= totalPages && page <= maxPages);

    return undefined;
  }

  // Returns the raw file bytes with the original Content-Type and
  // Content-Disposition when requested with the account's bearer token.
  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/attachments/get-attachment-file/
  getAttachmentFileUrl(conversationId: number, attachmentId: number) {
    return `${API_BASE_URL}/conversations/${conversationId}/attachments/${attachmentId}/file`;
  }

  private async createThread(
    conversationId: number,
    endpoint: 'reply' | 'notes' | 'phones' | 'chats',
    body: Record<string, unknown>
  ) {
    let response = await this.http.post(`/conversations/${conversationId}/${endpoint}`, body);
    return { threadId: getCreatedResourceId(response.headers) };
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/reply/
  async createReply(
    conversationId: number,
    data: {
      text: string;
      customer: HelpScoutCustomerRef;
      draft?: boolean;
      status?: string;
      assignTo?: number;
      cc?: string[];
      bcc?: string[];
      attachments?: HelpScoutThreadAttachment[];
    }
  ) {
    return await this.createThread(conversationId, 'reply', {
      text: data.text,
      customer: data.customer,
      draft: data.draft ?? false,
      status: data.status,
      assignTo: data.assignTo,
      cc: data.cc,
      bcc: data.bcc,
      attachments: data.attachments
    });
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/note/
  async createNote(
    conversationId: number,
    data: {
      text: string;
      status?: string;
      attachments?: HelpScoutThreadAttachment[];
    }
  ) {
    return await this.createThread(conversationId, 'notes', {
      text: data.text,
      status: data.status,
      attachments: data.attachments
    });
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/phone/
  async createPhoneThread(
    conversationId: number,
    data: {
      text: string;
      customer: HelpScoutCustomerRef;
      attachments?: HelpScoutThreadAttachment[];
    }
  ) {
    return await this.createThread(conversationId, 'phones', {
      text: data.text,
      customer: data.customer,
      attachments: data.attachments
    });
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/chat/
  async createChatThread(
    conversationId: number,
    data: {
      text: string;
      customer: HelpScoutCustomerRef;
      attachments?: HelpScoutThreadAttachment[];
    }
  ) {
    return await this.createThread(conversationId, 'chats', {
      text: data.text,
      customer: data.customer,
      attachments: data.attachments
    });
  }

  // ─── Customers ──────────────────────────────────────────────

  // https://developer.helpscout.com/mailbox-api/endpoints/customers/list/
  async listCustomers(
    params: {
      mailbox?: number;
      firstName?: string;
      lastName?: string;
      modifiedSince?: string;
      query?: string;
      page?: number;
      sortField?: string;
      sortOrder?: string;
    } = {}
  ) {
    let response = await this.http.get('/customers', {
      params: {
        mailbox: params.mailbox,
        firstName: params.firstName,
        lastName: params.lastName,
        modifiedSince: params.modifiedSince,
        query: params.query,
        page: params.page,
        sortField: params.sortField,
        sortOrder: params.sortOrder
      }
    });
    return response.data;
  }

  async getCustomer(customerId: number) {
    let response = await this.http.get(`/customers/${customerId}`);
    return response.data;
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/customers/create/
  async createCustomer(data: {
    firstName?: string;
    lastName?: string;
    emails?: Array<{ type: string; value: string }>;
    phones?: Array<{ type: string; value: string }>;
    organization?: string;
    organizationId?: number;
    jobTitle?: string;
    background?: string;
  }) {
    let response = await this.http.post('/customers', data);
    return { customerId: getCreatedResourceId(response.headers) };
  }

  // JSON Patch update; PUT would overwrite every omitted field with null.
  // https://developer.helpscout.com/mailbox-api/endpoints/customers/update/
  async patchCustomer(customerId: number, operations: HelpScoutPatchOperation[]) {
    await this.http.patch(`/customers/${customerId}`, operations);
  }

  // Full overwrite of the customer entity; omitted fields are cleared.
  // https://developer.helpscout.com/mailbox-api/endpoints/customers/overwrite/
  async overwriteCustomer(customerId: number, data: Record<string, unknown>) {
    await this.http.put(`/customers/${customerId}`, data);
  }

  async deleteCustomer(customerId: number) {
    await this.http.delete(`/customers/${customerId}`);
  }

  // ─── Organizations ─────────────────────────────────────────

  // https://developer.helpscout.com/mailbox-api/endpoints/organizations/list/
  async listOrganizations(params: { page?: number; sort?: string } = {}) {
    let response = await this.http.get('/organizations', { params });
    return response.data;
  }

  async getOrganization(organizationId: number) {
    let response = await this.http.get(`/organizations/${organizationId}`);
    return response.data;
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/organizations/create/
  async createOrganization(data: Record<string, unknown>) {
    let response = await this.http.post('/organizations', data);
    return { organizationId: getCreatedResourceId(response.headers) };
  }

  // Full replacement: omitted fields are cleared by Help Scout.
  // https://developer.helpscout.com/mailbox-api/endpoints/organizations/update/
  async replaceOrganization(organizationId: number, data: Record<string, unknown>) {
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

  // Help Scout exposes only list and get for tags; tags are created by applying
  // them to a conversation.
  // https://developer.helpscout.com/mailbox-api/endpoints/tags/list/
  async listTags(params: { page?: number } = {}) {
    let response = await this.http.get('/tags', { params });
    return response.data;
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/tags/get/
  async getTag(tagId: number) {
    let response = await this.http.get(`/tags/${tagId}`);
    return response.data;
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

  // https://developer.helpscout.com/mailbox-api/endpoints/users/list/
  async listUsers(params: { page?: number; email?: string; mailbox?: number } = {}) {
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

  // https://developer.helpscout.com/mailbox-api/endpoints/workflows/list/
  async listWorkflows(params: { page?: number; mailboxId?: number; type?: string } = {}) {
    let response = await this.http.get('/workflows', { params });
    return response.data;
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/workflows/update/
  async updateWorkflowStatus(workflowId: number, status: 'active' | 'inactive') {
    await this.http.patch(`/workflows/${workflowId}`, {
      op: 'replace',
      path: '/status',
      value: status
    });
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/workflows/run/
  async runWorkflowOnConversations(workflowId: number, conversationIds: number[]) {
    await this.http.post(`/workflows/${workflowId}/run`, { conversationIds });
  }

  // ─── Reports ────────────────────────────────────────────────

  // https://developer.helpscout.com/mailbox-api/endpoints/reports/company/reports-company-overall/
  async getReport(
    reportType: 'company' | 'conversations' | 'happiness' | 'productivity',
    params: ReportParams
  ) {
    let response = await this.http.get(`/reports/${reportType}`, { params });
    return response.data;
  }

  // https://developer.helpscout.com/mailbox-api/endpoints/reports/happiness/reports-happiness-ratings/
  async listHappinessRatings(params: {
    start: string;
    end: string;
    mailboxes?: string;
    rating?: string;
    page?: number;
    sortField?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/reports/happiness/ratings', { params });
    return response.data;
  }
}
