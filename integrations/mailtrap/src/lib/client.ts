import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

let generalApi = createAuthenticatedAxios({
  baseURL: 'https://mailtrap.io',
  errorAdapter: error =>
    buildApiServiceError(error, { providerLabel: 'Mailtrap', reason: 'mailtrap_api_error' })
});
let sendApi = createAuthenticatedAxios({
  baseURL: 'https://send.api.mailtrap.io',
  errorAdapter: error =>
    buildApiServiceError(error, { providerLabel: 'Mailtrap', reason: 'mailtrap_api_error' })
});
let bulkApi = createAuthenticatedAxios({
  baseURL: 'https://bulk.api.mailtrap.io',
  errorAdapter: error =>
    buildApiServiceError(error, { providerLabel: 'Mailtrap', reason: 'mailtrap_api_error' })
});

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  content: string;
  filename: string;
  type?: string;
  disposition?: string;
  contentId?: string;
}

export interface SendEmailParams {
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject?: string;
  text?: string;
  html?: string;
  templateUuid?: string;
  templateVariables?: Record<string, string>;
  attachments?: EmailAttachment[];
  category?: string;
  customVariables?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface MailtrapContact {
  id: string;
  email: string;
  fields: Record<string, unknown>;
  list_ids: number[];
  status: 'subscribed' | 'unsubscribed';
  created_at: number;
  updated_at: number;
}

export interface MailtrapSandbox {
  id: number;
  name: string;
  project_id: number;
  status: string;
  emails_count: number;
  emails_unread_count: number;
}

export class MailtrapClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { 'Api-Token': this.token };
  }

  private authHeaders() {
    return {
      'Api-Token': this.token,
      'Content-Type': 'application/json'
    };
  }

  private buildEmailBody(params: SendEmailParams) {
    if (params.templateUuid) {
      if (params.text !== undefined || params.html !== undefined) {
        throw createApiServiceError('Provide templateUuid or text/html content, not both.');
      }
    } else if (!params.subject || (!params.text && !params.html)) {
      throw createApiServiceError(
        'Provide a subject and text or html content, or use templateUuid.'
      );
    }
    let body: Record<string, unknown> = pickDefined({
      from: params.from,
      to: params.to,
      subject: params.templateUuid ? undefined : params.subject
    });

    if (params.cc) body.cc = params.cc;
    if (params.bcc) body.bcc = params.bcc;
    if (params.replyTo) body.reply_to = params.replyTo;
    if (params.text) body.text = params.text;
    if (params.html) body.html = params.html;
    if (params.templateUuid) body.template_uuid = params.templateUuid;
    if (params.templateVariables) body.template_variables = params.templateVariables;
    if (params.category) body.category = params.category;
    if (params.customVariables) body.custom_variables = params.customVariables;
    if (params.headers) body.headers = params.headers;
    if (params.attachments) {
      body.attachments = params.attachments.map(a => ({
        content: a.content,
        filename: a.filename,
        type: a.type,
        disposition: a.disposition || 'attachment',
        content_id: a.contentId
      }));
    }

    return body;
  }

  // ─── Email Sending (Transactional) ───────────────────────────────

  async sendTransactionalEmail(params: SendEmailParams) {
    let response = await sendApi.post('/api/send', this.buildEmailBody(params), {
      headers: this.authHeaders()
    });
    return response.data;
  }

  // ─── Email Sending (Bulk) ────────────────────────────────────────

  async sendBulkEmail(params: SendEmailParams) {
    let response = await bulkApi.post('/api/send', this.buildEmailBody(params), {
      headers: this.authHeaders()
    });
    return response.data;
  }

  async listContacts(params: {
    listId?: number;
    status?: string;
    email?: string;
    perPage?: number;
    cursor?: string;
  }) {
    let response = await generalApi.get<{
      data: MailtrapContact[];
      pagination: { next_token: string | null };
    }>('/api/contacts', {
      headers: this.headers(),
      params: pickDefined({
        list_id: params.listId,
        status: params.status,
        email: params.email,
        per_page: params.perPage,
        token: params.cursor
      })
    });
    return response.data;
  }

  async listSandboxInboxes() {
    let response = await generalApi.get<MailtrapSandbox[]>('/api/sandboxes', {
      headers: this.headers()
    });
    return response.data;
  }

  // ─── Contacts ────────────────────────────────────────────────────

  async createContact(contact: {
    email: string;
    fields?: Record<string, any>;
    listIds?: number[];
  }) {
    let response = await generalApi.post(
      `/api/contacts`,
      {
        contact: pickDefined({
          email: contact.email,
          fields: contact.fields,
          list_ids: contact.listIds
        })
      },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getContact(contactIdentifier: string) {
    let response = await generalApi.get(
      `/api/contacts/${encodeURIComponent(contactIdentifier)}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async updateContact(
    contactIdentifier: string,
    data: {
      email?: string;
      fields?: Record<string, any>;
      listIdsIncluded?: number[];
      listIdsExcluded?: number[];
      unsubscribed?: boolean;
    }
  ) {
    let current = data.email ? undefined : await this.getContact(contactIdentifier);
    let body: Record<string, unknown> = {
      email: data.email ?? current?.data?.email ?? current?.email
    };
    if (!body.email) {
      throw createApiServiceError('Provide the contact email when updating this contact.');
    }
    if (data.fields) body.fields = data.fields;
    if (data.listIdsIncluded) body.list_ids_included = data.listIdsIncluded;
    if (data.listIdsExcluded) body.list_ids_excluded = data.listIdsExcluded;
    if (data.unsubscribed !== undefined) body.unsubscribed = data.unsubscribed;

    let response = await generalApi.patch(
      `/api/contacts/${encodeURIComponent(contactIdentifier)}`,
      { contact: body },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async deleteContact(contactIdentifier: string) {
    await generalApi.delete(`/api/contacts/${encodeURIComponent(contactIdentifier)}`, {
      headers: this.headers()
    });
  }

  // ─── Contact Lists ───────────────────────────────────────────────

  async listContactLists() {
    let response = await generalApi.get(`/api/contacts/lists`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createContactList(name: string) {
    let response = await generalApi.post(
      `/api/contacts/lists`,
      { name },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getContactList(listId: number) {
    let response = await generalApi.get(`/api/contacts/lists/${listId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateContactList(listId: number, name: string) {
    let response = await generalApi.patch(
      `/api/contacts/lists/${listId}`,
      { name },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async deleteContactList(listId: number) {
    await generalApi.delete(`/api/contacts/lists/${listId}`, {
      headers: this.headers()
    });
  }

  // ─── Sandbox: Projects ──────────────────────────────────────────

  async listProjects() {
    let response = await generalApi.get(`/api/projects`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ─── Sandbox: Messages ──────────────────────────────────────────

  async listSandboxMessages(
    inboxId: string,
    params?: { search?: string; lastId?: string; page?: number }
  ) {
    let query: Record<string, any> = {};
    if (params?.search) query.search = params.search;
    if (params?.lastId) query.last_id = params.lastId;
    if (params?.page) query.page = params.page;

    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages`,
      { headers: this.headers(), params: query }
    );
    return response.data;
  }

  async getSandboxMessage(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageHtml(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/body.html`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageText(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/body.txt`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageSpamReport(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/spam_report`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageHtmlAnalysis(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/analyze`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async updateSandboxMessage(inboxId: string, messageId: string, isRead: boolean) {
    let response = await generalApi.patch(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      { message: { is_read: isRead } },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async deleteSandboxMessage(inboxId: string, messageId: string) {
    let response = await generalApi.delete(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async forwardSandboxMessage(inboxId: string, messageId: string, email: string) {
    let response = await generalApi.post(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/forward`,
      { email },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getSandboxMessageAttachments(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/sandboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/attachments`,
      { headers: this.headers() }
    );
    return response.data;
  }

  // ─── Sending Domains ─────────────────────────────────────────────

  async listSendingDomains() {
    let response = await generalApi.get(`/api/domains`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createSendingDomain(domainName: string) {
    let response = await generalApi.post(
      `/api/domains`,
      { domain: { domain_name: domainName } },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getSendingDomain(domainId: number) {
    let response = await generalApi.get(`/api/domains/${domainId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteSendingDomain(domainId: number) {
    await generalApi.delete(`/api/domains/${domainId}`, {
      headers: this.headers()
    });
  }

  // ─── Suppressions ────────────────────────────────────────────────

  async listSuppressions(params?: {
    email?: string;
    startTime?: string;
    endTime?: string;
    lastId?: string;
  }) {
    let query: Record<string, any> = {};
    if (params?.email) query.email = params.email;
    if (params?.lastId) query.last_id = params.lastId;
    if (params?.startTime) query.start_time = params.startTime;
    if (params?.endTime) query.end_time = params.endTime;

    let response = await generalApi.get(`/api/suppressions`, {
      headers: this.headers(),
      params: query
    });
    return response.data;
  }

  async deleteSuppression(suppressionId: number | string) {
    let response = await generalApi.delete(
      `/api/suppressions/${encodeURIComponent(String(suppressionId))}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  // ─── Statistics ──────────────────────────────────────────────────

  async getStats(params: {
    startDate: string;
    endDate: string;
    sendingDomainIds?: number[];
    sendingStreams?: string[];
    categories?: string[];
    groupBy?: string;
  }) {
    let query: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.sendingDomainIds) query['domain_ids[]'] = params.sendingDomainIds;
    if (params.sendingStreams) query['sending_streams[]'] = params.sendingStreams;
    if (params.categories) query['categories[]'] = params.categories;

    let path = `/api/stats`;
    if (params.groupBy) {
      path += `/${params.groupBy}`;
    }

    let response = await generalApi.get(path, {
      headers: this.headers(),
      params: query
    });
    return response.data;
  }

  // ─── Email Logs ──────────────────────────────────────────────────

  async listEmailLogs(params?: {
    searchAfter?: string;
    sentAfter?: string;
    sentBefore?: string;
    to?: string;
    from?: string;
    subject?: string;
    status?: string;
    sendingStream?: string;
    category?: string;
    sendingDomainId?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.searchAfter) query.search_after = params.searchAfter;
    if (params?.sentAfter) query['filters[sent_after]'] = params.sentAfter;
    if (params?.sentBefore) query['filters[sent_before]'] = params.sentBefore;
    for (let [field, value, operator] of [
      ['to', params?.to, 'ci_equal'],
      ['from', params?.from, 'ci_equal'],
      ['subject', params?.subject, 'ci_contain'],
      ['status', params?.status, 'equal'],
      ['sending_stream', params?.sendingStream, 'equal'],
      ['category', params?.category, 'equal'],
      ['domain_id', params?.sendingDomainId, 'equal']
    ] as const) {
      if (value !== undefined) {
        query[`filters[${field}][operator]`] = operator;
        query[`filters[${field}][value]`] = value;
      }
    }

    let response = await generalApi.get(`/api/email_logs`, {
      headers: this.headers(),
      params: query
    });
    return response.data;
  }

  async getEmailLog(messageId: string) {
    let response = await generalApi.get(`/api/email_logs/${encodeURIComponent(messageId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ─── Accounts ────────────────────────────────────────────────────

  async listAccounts() {
    let response = await generalApi.get('/api/accounts', {
      headers: this.headers()
    });
    return response.data;
  }
}
