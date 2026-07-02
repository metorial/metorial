import { createAxios } from 'slates';

let generalApi = createAxios({ baseURL: 'https://mailtrap.io' });
let sendApi = createAxios({ baseURL: 'https://send.api.mailtrap.io' });
let bulkApi = createAxios({ baseURL: 'https://bulk.api.mailtrap.io' });

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
  subject: string;
  text?: string;
  html?: string;
  templateUuid?: string;
  templateVariables?: Record<string, string>;
  attachments?: EmailAttachment[];
  category?: string;
  customVariables?: Record<string, string>;
  headers?: Record<string, string>;
}

export class MailtrapClient {
  private token: string;
  private accountId: string;

  constructor(config: { token: string; accountId: string }) {
    this.token = config.token;
    this.accountId = config.accountId;
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
    let body: Record<string, any> = {
      from: params.from,
      to: params.to,
      subject: params.subject
    };

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

  // ─── Contacts ────────────────────────────────────────────────────

  async createContact(contact: {
    email: string;
    fields?: Record<string, any>;
    listIds?: number[];
  }) {
    let response = await generalApi.post(
      `/api/accounts/${this.accountId}/contacts`,
      {
        email: contact.email,
        fields: contact.fields,
        list_ids: contact.listIds
      },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getContact(contactIdentifier: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/contacts/${contactIdentifier}`,
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
    let body: Record<string, any> = {};
    if (data.email) body.email = data.email;
    if (data.fields) body.fields = data.fields;
    if (data.listIdsIncluded) body.list_ids_included = data.listIdsIncluded;
    if (data.listIdsExcluded) body.list_ids_excluded = data.listIdsExcluded;
    if (data.unsubscribed !== undefined) body.unsubscribed = data.unsubscribed;

    let response = await generalApi.patch(
      `/api/accounts/${this.accountId}/contacts/${contactIdentifier}`,
      body,
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async deleteContact(contactIdentifier: string) {
    await generalApi.delete(`/api/accounts/${this.accountId}/contacts/${contactIdentifier}`, {
      headers: this.headers()
    });
  }

  // ─── Contact Lists ───────────────────────────────────────────────

  async listContactLists() {
    let response = await generalApi.get(`/api/accounts/${this.accountId}/contacts/lists`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createContactList(name: string) {
    let response = await generalApi.post(
      `/api/accounts/${this.accountId}/contacts/lists`,
      { name },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getContactList(listId: number) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/contacts/lists/${listId}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async updateContactList(listId: number, name: string) {
    let response = await generalApi.patch(
      `/api/accounts/${this.accountId}/contacts/lists/${listId}`,
      { name },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async deleteContactList(listId: number) {
    await generalApi.delete(`/api/accounts/${this.accountId}/contacts/lists/${listId}`, {
      headers: this.headers()
    });
  }

  // ─── Sandbox: Projects ──────────────────────────────────────────

  async listProjects() {
    let response = await generalApi.get(`/api/accounts/${this.accountId}/projects`, {
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
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages`,
      { headers: this.headers(), params: query }
    );
    return response.data;
  }

  async getSandboxMessage(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageHtml(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}/body.html`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageText(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}/body.txt`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageSpamReport(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}/spam_report`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async getSandboxMessageHtmlAnalysis(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}/analyze`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async updateSandboxMessage(inboxId: string, messageId: string, isRead: boolean) {
    let response = await generalApi.patch(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}`,
      { message: { is_read: isRead } },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async deleteSandboxMessage(inboxId: string, messageId: string) {
    let response = await generalApi.delete(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async forwardSandboxMessage(inboxId: string, messageId: string, email: string) {
    let response = await generalApi.post(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}/forward`,
      { email },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getSandboxMessageAttachments(inboxId: string, messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/inboxes/${inboxId}/messages/${messageId}/attachments`,
      { headers: this.headers() }
    );
    return response.data;
  }

  // ─── Sending Domains ─────────────────────────────────────────────

  async listSendingDomains() {
    let response = await generalApi.get(`/api/accounts/${this.accountId}/sending_domains`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createSendingDomain(domainName: string) {
    let response = await generalApi.post(
      `/api/accounts/${this.accountId}/sending_domains`,
      { sending_domain: { domain_name: domainName } },
      { headers: this.authHeaders() }
    );
    return response.data;
  }

  async getSendingDomain(domainId: number) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/sending_domains/${domainId}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async deleteSendingDomain(domainId: number) {
    await generalApi.delete(`/api/accounts/${this.accountId}/sending_domains/${domainId}`, {
      headers: this.headers()
    });
  }

  // ─── Suppressions ────────────────────────────────────────────────

  async listSuppressions(params?: { email?: string; startTime?: string; endTime?: string }) {
    let query: Record<string, any> = {};
    if (params?.email) query.email = params.email;
    if (params?.startTime) query.start_time = params.startTime;
    if (params?.endTime) query.end_time = params.endTime;

    let response = await generalApi.get(`/api/accounts/${this.accountId}/suppressions`, {
      headers: this.headers(),
      params: query
    });
    return response.data;
  }

  async deleteSuppression(suppressionId: number) {
    let response = await generalApi.delete(
      `/api/accounts/${this.accountId}/suppressions/${suppressionId}`,
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
    if (params.sendingDomainIds) query['sending_domain_ids[]'] = params.sendingDomainIds;
    if (params.sendingStreams) query['sending_streams[]'] = params.sendingStreams;
    if (params.categories) query['categories[]'] = params.categories;

    let path = `/api/accounts/${this.accountId}/stats`;
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
    if (params?.to) query['filters[to]'] = params.to;
    if (params?.from) query['filters[from]'] = params.from;
    if (params?.subject) query['filters[subject]'] = params.subject;
    if (params?.status) query['filters[status]'] = params.status;
    if (params?.sendingStream) query['filters[sending_stream]'] = params.sendingStream;
    if (params?.category) query['filters[category]'] = params.category;
    if (params?.sendingDomainId) query['filters[sending_domain_id]'] = params.sendingDomainId;

    let response = await generalApi.get(`/api/accounts/${this.accountId}/email_logs`, {
      headers: this.headers(),
      params: query
    });
    return response.data;
  }

  async getEmailLog(messageId: string) {
    let response = await generalApi.get(
      `/api/accounts/${this.accountId}/email_logs/${messageId}`,
      { headers: this.headers() }
    );
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
