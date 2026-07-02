import { createAxios } from 'slates';

export interface MailboxCreateParams {
  name: string;
}

export interface MailboxUpdateParams {
  name?: string;
  emailPrefix?: string;
  processAttachments?: boolean;
  collectEmails?: boolean;
  alertEmailH?: number;
}

export interface ListDocsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  q?: string;
  status?: string;
}

export interface SubmitHtmlDocParams {
  name?: string;
  html?: string;
  text?: string;
  from?: string;
  to?: string;
  subject?: string;
  meta?: Record<string, unknown>;
}

export interface WebhookCreateParams {
  mailboxId: string;
  url: string;
  event: string;
  tableId?: string;
}

export interface WebhookUpdateParams {
  url?: string;
  event?: string;
  tableId?: string;
}

export interface ListParsedDataParams {
  from?: string;
  to?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.parsio.io',
      headers: {
        'X-API-Key': config.token
      }
    });
  }

  // ---- Mailboxes ----

  async listMailboxes(): Promise<any[]> {
    let response = await this.axios.get('/mailboxes/');
    return response.data;
  }

  async getMailbox(mailboxId: string): Promise<any> {
    let response = await this.axios.get(`/mailboxes/${mailboxId}`);
    return response.data;
  }

  async createMailbox(params: MailboxCreateParams): Promise<any> {
    let response = await this.axios.post('/mailboxes/create', {
      name: params.name
    });
    return response.data;
  }

  async updateMailbox(mailboxId: string, params: MailboxUpdateParams): Promise<any> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.emailPrefix !== undefined) body.email_prefix = params.emailPrefix;
    if (params.processAttachments !== undefined)
      body.process_attachments = params.processAttachments;
    if (params.collectEmails !== undefined) body.collect_emails = params.collectEmails;
    if (params.alertEmailH !== undefined) body.alert_email_h = params.alertEmailH;

    let response = await this.axios.post(`/mailboxes/${mailboxId}`, body);
    return response.data;
  }

  async deleteMailbox(mailboxId: string): Promise<any> {
    let response = await this.axios.delete(`/mailboxes/${mailboxId}`);
    return response.data;
  }

  async getTableFields(mailboxId: string): Promise<any> {
    let response = await this.axios.get(`/mailboxes/${mailboxId}/tableFields`);
    return response.data;
  }

  // ---- Documents ----

  async listDocuments(mailboxId: string, params?: ListDocsParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.q) queryParams.q = params.q;
    if (params?.status) queryParams.status = params.status;

    let response = await this.axios.get(`/mailboxes/${mailboxId}/docs`, {
      params: queryParams
    });
    return response.data;
  }

  async getDocument(documentId: string): Promise<any> {
    let response = await this.axios.get(`/docs/${documentId}`);
    return response.data;
  }

  async submitHtmlDoc(mailboxId: string, params: SubmitHtmlDocParams): Promise<any> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.html !== undefined) body.html = params.html;
    if (params.text !== undefined) body.text = params.text;
    if (params.from !== undefined) body.from = params.from;
    if (params.to !== undefined) body.to = params.to;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.meta !== undefined) body.meta = params.meta;

    let response = await this.axios.post(`/mailboxes/${mailboxId}/doc`, body);
    return response.data;
  }

  async parseDocument(documentId: string): Promise<any> {
    let response = await this.axios.post(`/docs/${documentId}/parse`);
    return response.data;
  }

  async skipDocuments(mailboxId: string, documentIds: string[]): Promise<any> {
    let response = await this.axios.post(`/mailboxes/${mailboxId}/docs/skip`, {
      ids: documentIds
    });
    return response.data;
  }

  // ---- Templates ----

  async listTemplates(mailboxId: string): Promise<any[]> {
    let response = await this.axios.get(`/mailboxes/${mailboxId}/templates`);
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  async enableTemplates(templateIds: string[]): Promise<any> {
    let response = await this.axios.post('/templates/enable_many', {
      ids: templateIds
    });
    return response.data;
  }

  async disableTemplates(templateIds: string[]): Promise<any> {
    let response = await this.axios.post('/templates/disable_many', {
      ids: templateIds
    });
    return response.data;
  }

  async deleteTemplates(templateIds: string[]): Promise<any> {
    let response = await this.axios.delete('/templates', {
      data: { ids: templateIds }
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(mailboxId: string): Promise<any[]> {
    let response = await this.axios.get(`/webhooks/mb/${mailboxId}`);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(params: WebhookCreateParams): Promise<any> {
    let body: Record<string, unknown> = {
      url: params.url,
      event: params.event
    };
    if (params.tableId !== undefined) body.table_id = params.tableId;

    let response = await this.axios.post(`/webhooks/${params.mailboxId}`, body);
    return response.data;
  }

  async updateWebhook(webhookId: string, params: WebhookUpdateParams): Promise<any> {
    let body: Record<string, unknown> = {};
    if (params.url !== undefined) body.url = params.url;
    if (params.event !== undefined) body.event = params.event;
    if (params.tableId !== undefined) body.table_id = params.tableId;

    let response = await this.axios.post(`/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhooks(webhookIds: string[]): Promise<any> {
    let response = await this.axios.delete('/webhooks', {
      data: { ids: webhookIds }
    });
    return response.data;
  }

  // ---- Parsed Data ----

  async getParsedData(mailboxId: string, params?: ListParsedDataParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    let response = await this.axios.get(`/mailboxes/${mailboxId}/parsed`, {
      params: queryParams
    });
    return response.data;
  }

  async getCollectedEmails(mailboxId: string): Promise<any> {
    let response = await this.axios.get(`/mailboxes/${mailboxId}/emails`);
    return response.data;
  }
}
