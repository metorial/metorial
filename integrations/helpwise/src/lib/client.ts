import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios;
  private v0;
  private v1;

  constructor(private config: { token: string }) {
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, { providerLabel: 'Helpwise', reason: 'helpwise_api_error' });
    let options = { headers: { Accept: 'application/json' }, timeout: 30000, errorAdapter };
    this.axios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://app.helpwise.io/dev-apis/v1',
      authHeader: { value: config.token }
    });
    this.v0 = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://app.helpwise.io/dev-apis',
      authHeader: { value: config.token }
    });
    this.v1 = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://apis.helpwise.io',
      authHeader: { value: `Basic ${Buffer.from(config.token).toString('base64')}` }
    });
    for (let client of [this.axios, this.v0, this.v1]) {
      client.interceptors.response.use(response => {
        let data = response.data;
        if (
          data &&
          (data.success === false || data.status === 'error' || data.status === 'failed')
        ) {
          throw createApiServiceError(
            typeof data.message === 'string' ? data.message : 'Helpwise rejected the request.',
            { reason: 'helpwise_api_error' }
          );
        }
        return response;
      });
    }
  }

  private get headers() {
    return {
      Authorization: this.config.token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private numericId(value: string, field: string) {
    let id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
      throw createApiServiceError(`${field} must be a positive integer ID.`, {
        reason: 'invalid_helpwise_id'
      });
    }
    return id;
  }

  // ---- Mailboxes ----

  async listMailboxes(params?: { limit?: number; page?: number }) {
    let response = await this.v0.request({
      method: 'POST',
      url: '/mailboxes/list',
      data: params
    });
    return response.data;
  }

  async getMailbox(mailboxId: string) {
    let response = await this.v0.request({
      method: 'POST',
      url: '/mailboxes/get',
      data: { id: this.numericId(mailboxId, 'mailboxId') }
    });
    return response.data;
  }

  async createMailbox(data: { email: string; display_name: string; [key: string]: any }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/mailboxes',
      headers: this.headers,
      data
    });
    return response.data;
  }

  async updateMailbox(mailboxId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/mailboxes/${mailboxId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteMailbox(mailboxId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/mailboxes/${mailboxId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Conversations ----

  async listConversations(
    params: {
      mailbox_id?: string;
      status?: string;
      limit?: number;
      page?: number;
      tag_id?: string;
      query?: string;
      pageToken?: string;
      labelId?: number;
    } = {}
  ) {
    // Preserve legacy filtering/page calls that have no documented V1 equivalent.
    let current =
      params.mailbox_id &&
      !params.tag_id &&
      !params.query &&
      (!params.status || params.status === 'closed') &&
      (!params.page || params.page === 1);
    if (!current && (params.pageToken !== undefined || params.labelId !== undefined)) {
      throw createApiServiceError(
        'V1 pagination and folder filters require mailboxId; omit query, tagId, status other than closed, and page above 1.',
        { reason: 'invalid_helpwise_filters' }
      );
    }
    let response = current
      ? await this.v1.request({
          method: 'GET',
          url: '/conversations',
          params: {
            inboxIds: [this.numericId(params.mailbox_id ?? '', 'mailboxId')],
            labelId: params.labelId ?? (params.status === 'closed' ? 7 : 14),
            limit: params.limit,
            pageToken: params.pageToken
          }
        })
      : await this.axios.request({ method: 'GET', url: '/conversations', params });
    return response.data;
  }

  async getConversation(
    conversationId: string,
    params: {
      mailbox_id?: string;
      pageToken?: string;
      limit?: number;
      labelId?: number;
    } = {}
  ) {
    if (
      !params.mailbox_id &&
      (params.pageToken !== undefined ||
        params.labelId !== undefined ||
        params.limit !== undefined)
    ) {
      throw createApiServiceError('mailboxId is required for V1 message pagination.', {
        reason: 'missing_mailbox_id'
      });
    }
    let response = params.mailbox_id
      ? await this.v1.request({
          method: 'GET',
          url: `/inboxes/${this.numericId(params.mailbox_id, 'mailboxId')}/conversations/${this.numericId(conversationId, 'conversationId')}`,
          params: {
            pageToken: params.pageToken,
            limit: params.limit,
            labelId: params.labelId ?? 14
          }
        })
      : await this.axios.request({
          method: 'GET',
          url: `/conversations/${encodeURIComponent(conversationId)}`
        });
    return response.data;
  }

  async deleteConversation(conversationId: string) {
    let response = await this.v1.request({
      method: 'PUT',
      url: '/conversations/action/delete',
      data: { ids: [this.numericId(conversationId, 'conversationId')] }
    });
    return response.data;
  }

  async closeConversations(ids: number[]) {
    let response = await this.v1.request({
      method: 'PUT',
      url: '/conversations/action/close',
      data: { ids }
    });
    return response.data;
  }

  async manageConversationTags(
    action: 'apply' | 'remove',
    threadIds: number[],
    tagIds: number[]
  ) {
    let response = await this.v1.request({
      method: 'POST',
      url: `/tags/${action}`,
      data: { threadIds, tagIds }
    });
    return response.data;
  }

  // ---- Messages / Emails ----

  async listMessages(params: {
    mailbox_id: string;
    thread_id: string;
    limit?: number;
    page?: number;
  }) {
    let response = await this.v0.request({
      method: 'POST',
      url: '/emails/list',
      data: {
        mailboxId: this.numericId(params.mailbox_id, 'mailboxId'),
        threadId: this.numericId(params.thread_id, 'conversationId'),
        limit: params.limit,
        page: params.page
      }
    });
    return response.data;
  }

  async sendEmail(data: {
    mailbox_id: string;
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    thread_id?: string;
    reply_to?: string;
  }) {
    let legacy = data.thread_id !== undefined || data.bcc !== undefined;
    if (legacy && data.reply_to !== undefined) {
      throw createApiServiceError(
        'replyTo is available for new emails without bcc or conversationId.',
        { reason: 'invalid_helpwise_email_options' }
      );
    }
    let response = legacy
      ? await this.axios.request({ method: 'POST', url: '/messages', data })
      : await this.v0.request({
          method: 'POST',
          url: '/emails/send_mail',
          data: { ...data, mailbox_id: this.numericId(data.mailbox_id, 'mailboxId') }
        });
    return response.data;
  }

  async updateMessage(messageId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/messages/${messageId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteMessage(messageId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/messages/${messageId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params: { limit?: number; page?: number; offset?: number } = {}) {
    let limit = params.limit ?? (params.page !== undefined ? 20 : undefined);
    let offset =
      params.offset ??
      (params.page !== undefined ? (params.page - 1) * (limit ?? 20) : undefined);
    let response = await this.v1.request({
      method: 'GET',
      url: '/contacts',
      params: { limit, offset }
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.v1.request({
      method: 'GET',
      url: `/contacts/${this.numericId(contactId, 'contactId')}`
    });
    return response.data;
  }

  async createContact(data: {
    email?: string;
    phone?: string;
    name?: string;
    company?: string;
  }) {
    let response = await this.v1.request({
      method: 'POST',
      url: '/contacts',
      data: {
        firstname: data.name,
        company: data.company,
        emails: data.email !== undefined ? [data.email] : undefined,
        phones:
          data.phone !== undefined
            ? [{ phoneTxt: data.phone, phoneNo: data.phone, type: '0' }]
            : undefined
      }
    });
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: { email?: string; phone?: string; name?: string; company?: string }
  ) {
    let response = await this.v1.request({
      method: 'PUT',
      url: `/contacts/${this.numericId(contactId, 'contactId')}`,
      data: {
        firstname: data.name,
        company: data.company,
        emails: data.email !== undefined ? [data.email] : undefined,
        phones:
          data.phone !== undefined
            ? [{ phoneTxt: data.phone, phoneNo: data.phone, type: '0' }]
            : undefined
      }
    });
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/contacts/${contactId}`,
      headers: this.headers
    });
    return response.data;
  }

  async searchContacts(params: {
    query: string;
    limit?: number;
    page?: number;
    offset?: number;
  }) {
    let limit = params.limit ?? (params.page !== undefined ? 20 : undefined);
    let offset =
      params.offset ??
      (params.page !== undefined ? (params.page - 1) * (limit ?? 20) : undefined);
    let response = await this.v1.request({
      method: 'GET',
      url: '/contacts/search',
      params: { term: params.query, limit, offset }
    });
    return response.data;
  }

  // ---- Notes ----

  async listNotes(conversationId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/conversations/${conversationId}/notes`,
      headers: this.headers
    });
    return response.data;
  }

  async addNote(conversationId: string, data: { body: string; mailbox_id?: string }) {
    let response = data.mailbox_id
      ? await this.v0.request({
          method: 'POST',
          url: '/notes/add',
          data: {
            thread_id: this.numericId(conversationId, 'conversationId'),
            mailbox_id: this.numericId(data.mailbox_id, 'mailboxId'),
            message: data.body
          }
        })
      : await this.axios.request({
          method: 'POST',
          url: `/conversations/${conversationId}/notes`,
          data
        });
    return response.data;
  }

  async deleteNote(conversationId: string, noteId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/conversations/${conversationId}/notes/${noteId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Attachments ----

  async getConversationAttachments(conversationId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/conversations/${conversationId}/attachments`,
      headers: this.headers
    });
    return response.data;
  }

  async getAttachment(attachmentId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/attachments/${attachmentId}`,
      headers: this.headers
    });
    return response.data;
  }

  async createAttachment(data: {
    conversation_id: string;
    file_url?: string;
    file_name?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/attachments',
      headers: this.headers,
      data
    });
    return response.data;
  }

  // ---- Tags ----

  async listTags() {
    let response = await this.v1.request({ method: 'GET', url: '/tags' });
    return response.data;
  }

  async getTag(tagId: string) {
    let response = await this.v1.request({
      method: 'GET',
      url: `/tags/${this.numericId(tagId, 'tagId')}`
    });
    return response.data;
  }

  async updateTag(tagId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/tags/${tagId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteTag(tagId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/tags/${tagId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Teams ----

  async listTeams() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/teams',
      headers: this.headers
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/teams/${teamId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Users ----

  async listUsers(mailboxId?: string) {
    let response = await this.v0.request({
      method: 'POST',
      url: '/users/list',
      data: { mailbox_id: mailboxId ? this.numericId(mailboxId, 'mailboxId') : undefined }
    });
    return response.data;
  }

  async getMe() {
    let response = await this.v0.request({ method: 'POST', url: '/users/me' });
    let result = response.data;
    let user = result?.data?.user ?? result?.data ?? result?.user ?? result;
    if (
      !user ||
      typeof user !== 'object' ||
      Array.isArray(user) ||
      !['string', 'number'].includes(typeof user.id)
    ) {
      throw createApiServiceError(
        'Helpwise did not return a current user ID. Verify the API key and secret.',
        { reason: 'invalid_helpwise_profile' }
      );
    }
    return user;
  }

  // ---- Templates ----

  async listTemplates() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/templates',
      headers: this.headers
    });
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/templates/${templateId}`,
      headers: this.headers
    });
    return response.data;
  }

  async updateTemplate(templateId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/templates/${templateId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/templates/${templateId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Signatures ----

  async deleteSignature(signatureId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/signatures/${signatureId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/webhooks',
      headers: this.headers
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/webhooks/${webhookId}`,
      headers: this.headers
    });
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    event_type: string;
    secret_key?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/webhooks',
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/webhooks/${webhookId}`,
      headers: this.headers
    });
    return response.data;
  }
}
