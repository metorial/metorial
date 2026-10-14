import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface MailboxCreateParams {
  name: string;
  preset?: string;
  mlModel?: string;
  hasRawData?: boolean;
  parseSig?: boolean;
}

export interface MailboxUpdateParams {
  name?: string;
  emailPrefix?: string;
  processAttachments?: boolean;
  collectEmails?: boolean;
  alertEmailH?: number;
  receiveEmail?: boolean;
  preset?: string;
  mlModel?: string;
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
  name?: string;
  enabled?: boolean;
}

export interface WebhookUpdateParams {
  url?: string;
  event?: string;
  tableId?: string;
  name?: string;
  enabled?: boolean;
}

export interface ListParsedDataParams {
  page?: number;
  from?: string;
  to?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token?.trim();
    if (!token || /[\r\n]/.test(token)) {
      throw createApiServiceError(
        'A valid Parsio API key is required. Reconnect with your API key.',
        {
          reason: 'invalid_api_key'
        }
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.parsio.io',
      authHeader: { name: 'X-API-Key', value: token },
      timeout: 120000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Parsio',
          reason: 'parsio_api_error'
        })
    });
  }

  // ---- Mailboxes ----

  async listMailboxes(): Promise<any[]> {
    let response = await this.axios.get('/mailboxes/');
    return response.data;
  }

  async getMailbox(mailboxId: string): Promise<any> {
    let response = await this.axios.get(`/mailboxes/${encodeURIComponent(mailboxId)}`);
    return response.data;
  }

  async createMailbox(params: MailboxCreateParams): Promise<any> {
    let response = await this.axios.post(
      '/mailboxes/create',
      pickDefined({
        name: params.name,
        preset: params.preset,
        ml_model: params.mlModel,
        has_raw_data: params.hasRawData,
        parse_sig: params.parseSig
      })
    );
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
    if (params.receiveEmail !== undefined) body.receive_email = params.receiveEmail;
    if (params.preset !== undefined) body.preset = params.preset;
    if (params.mlModel !== undefined) body.ml_model = params.mlModel;

    let response = await this.axios.post(`/mailboxes/${encodeURIComponent(mailboxId)}`, body);
    return response.data;
  }

  async deleteMailbox(mailboxId: string): Promise<any> {
    let response = await this.axios.delete(`/mailboxes/${encodeURIComponent(mailboxId)}`);
    return response.data;
  }

  async getTableFields(mailboxId: string): Promise<any> {
    let response = await this.axios.get(
      `/mailboxes/${encodeURIComponent(mailboxId)}/tableFields`
    );
    return response.data;
  }

  // ---- Documents ----

  async listDocuments(mailboxId: string, params?: ListDocsParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.limit !== undefined) queryParams.per_page = String(params.limit);
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.q) queryParams.q = params.q;
    if (params?.status) queryParams['status[]'] = params.status;

    let response = await this.axios.get(`/mailboxes/${encodeURIComponent(mailboxId)}/docs`, {
      params: queryParams
    });
    return response.data;
  }

  async getDocument(documentId: string): Promise<any> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(documentId)}`);
    return response.data;
  }

  async submitHtmlDoc(mailboxId: string, params: SubmitHtmlDocParams): Promise<any> {
    let response = await this.axios.post(
      `/mailboxes/${encodeURIComponent(mailboxId)}/doc`,
      this.documentBody(params)
    );
    return response.data;
  }

  async submitHtmlDocSync(mailboxId: string, params: SubmitHtmlDocParams): Promise<any> {
    let response = await this.axios.post(
      `/mailboxes/${encodeURIComponent(mailboxId)}/doc-sync`,
      this.documentBody(params)
    );
    return response.data;
  }

  private documentBody(params: SubmitHtmlDocParams) {
    if (!params.html?.trim() && !params.text?.trim()) {
      throw createApiServiceError('Provide non-empty HTML or text content to parse.', {
        reason: 'missing_document_content'
      });
    }
    return pickDefined({
      name: params.name ?? params.subject,
      html: params.html?.trim() ? params.html : undefined,
      text: params.text,
      from: params.from,
      to: params.to,
      meta: params.meta
    });
  }

  async parseDocument(documentId: string): Promise<any> {
    let response = await this.axios.post(`/docs/${encodeURIComponent(documentId)}/parse`);
    return response.data;
  }

  async skipDocuments(mailboxId: string, documentIds: string[]): Promise<any> {
    let response = await this.axios.post(
      `/mailboxes/${encodeURIComponent(mailboxId)}/docs/skip`,
      {
        ids: documentIds
      }
    );
    return response.data;
  }

  // ---- Templates ----

  async listTemplates(mailboxId: string, page?: number): Promise<any[]> {
    let response = await this.axios.get(
      `/mailboxes/${encodeURIComponent(mailboxId)}/templates`,
      {
        params: pickDefined({ page })
      }
    );
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/templates/${encodeURIComponent(templateId)}`);
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

  async cloneTemplates(templateIds: string[], mailboxId: string): Promise<any> {
    let response = await this.axios.post('/templates/clone_many', {
      ids: templateIds,
      mailbox_id: mailboxId
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(mailboxId: string): Promise<any[]> {
    let response = await this.axios.get(`/webhooks/mb/${encodeURIComponent(mailboxId)}`);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/webhooks/${encodeURIComponent(webhookId)}`);
    return response.data;
  }

  async createWebhook(params: WebhookCreateParams): Promise<any> {
    let body: Record<string, unknown> = {
      url: params.url,
      event: params.event
    };
    if (params.tableId !== undefined) body.table_id = params.tableId;
    if (params.name !== undefined) body.name = params.name;
    if (params.enabled !== undefined) body.enabled = params.enabled;

    if (params.event === 'table.parsed' && !params.tableId?.trim()) {
      throw createApiServiceError(
        'tableId is required for the table.parsed event. Find table IDs with get_mailbox.',
        {
          reason: 'missing_table_id'
        }
      );
    }

    let response = await this.axios.post(
      `/webhooks/${encodeURIComponent(params.mailboxId)}`,
      body
    );
    return response.data;
  }

  async updateWebhook(webhookId: string, params: WebhookUpdateParams): Promise<any> {
    let body: Record<string, unknown> = { _id: webhookId };
    if (params.url !== undefined) body.url = params.url;
    if (params.event !== undefined) body.event = params.event;
    if (params.tableId !== undefined) body.table_id = params.tableId;
    if (params.name !== undefined) body.name = params.name;
    if (params.enabled !== undefined) body.enabled = params.enabled;

    let response = await this.axios.post('/webhooks', body);
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    let response = await this.axios.get(`/mailboxes/${encodeURIComponent(mailboxId)}/parsed`, {
      params: queryParams
    });
    return response.data;
  }

  async getCollectedEmails(mailboxId: string): Promise<any> {
    let response = await this.axios.get(`/mailboxes/${encodeURIComponent(mailboxId)}/emails`);
    return response.data;
  }
}
