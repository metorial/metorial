import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  current: number;
  total: number;
  results: T[];
}

export interface Mailbox {
  id: number;
  name: string;
  account_uuid: string;
  email_prefix: string;
  secret: string;
  document_count: number;
  template_count: number;
  webhook_count: number;
  parser_object_count: number;
  ai_engine: string;
  identification_status: string;
  last_activity: string | null;
  process_attachments: boolean;
  retention_policy: number | null;
  force_ocr: boolean;
  allowed_extensions: string[];
  split_page: number | null;
  disable_deskew: boolean;
  csv_download: string;
  json_download: string;
  xls_download: string;
  document_per_status_count: Record<string, number>;
  webhook_set: WebhookRef[];
  available_webhook_set: WebhookRef[];
}

export interface WebhookRef {
  id: number;
  event: string;
  target: string;
  name: string;
  headers: Record<string, string> | null;
  category: string;
  parser_field_set: any[];
}

export interface Document {
  id: number;
  parser: number;
  status: string;
  created: string;
  modified: string;
  file_name: string;
  file_url: string | null;
  content_type: string | null;
  result: Record<string, any> | null;
  ocr_pages: any[] | null;
  credit_usage: number;
}

interface ApiDocument {
  id: number;
  parser: number;
  status: string;
  name?: string;
  received?: string;
  processed?: string | null;
  original_document_url?: string | null;
  credits_used?: number;
  result?: string | Record<string, any> | null;
  ocr_page_set?: any[] | null;
  file_name?: string;
  file_url?: string | null;
  content_type?: string | null;
  created?: string;
  modified?: string;
  credit_usage?: number;
  ocr_pages?: any[] | null;
}

let normalizeDocument = (document: ApiDocument): Document => {
  let result: unknown = document.result;
  if (typeof result === 'string') {
    try {
      result = result.trim() ? JSON.parse(result) : null;
    } catch (error) {
      throw createApiServiceError('Parseur returned invalid JSON in the document result.', {
        reason: 'invalid_parseur_response',
        parent: error
      });
    }
  }
  if (result !== undefined && result !== null && !isApiErrorRecord(result)) {
    throw createApiServiceError('Parseur returned a document result that is not an object.', {
      reason: 'invalid_parseur_response'
    });
  }

  return {
    id: document.id,
    parser: document.parser,
    status: document.status,
    file_name: document.name ?? document.file_name ?? '',
    file_url: document.original_document_url ?? document.file_url ?? null,
    content_type: document.content_type ?? null,
    created: document.received ?? document.created ?? '',
    modified:
      document.processed ?? document.modified ?? document.received ?? document.created ?? '',
    credit_usage: document.credits_used ?? document.credit_usage ?? 0,
    result: result ?? null,
    ocr_pages: document.ocr_page_set ?? document.ocr_pages ?? null
  };
};

export interface NotificationResponse {
  message?: string;
  notification_set?: { info?: string[] };
}

export let getNotificationMessage = (
  response: NotificationResponse,
  fallbackMessage: string
) => response.notification_set?.info?.join(' ') || response.message || fallbackMessage;

export interface DocumentLog {
  id: number;
  status: string;
  source: string;
  message: string;
  created: string;
}

export interface Template {
  id: number;
  engine: string;
  status: string;
  document_count: number;
  name: string;
  parser: number;
}

export interface Webhook {
  id: number;
  event: string;
  target: string;
  name: string;
  headers: Record<string, string> | null;
  category: string;
  parser_field_set: any[];
}

export interface UploadResponse {
  message: string;
  attachments: { name: string; DocumentID: string }[];
}

export interface ListMailboxesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
}

export interface ListDocumentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  receivedAfter?: string;
  receivedBefore?: string;
  status?: string;
  tz?: string;
  withResult?: boolean;
}

export interface CreateMailboxParams {
  name?: string;
  aiEngine?: string;
  templateSlug?: string;
  processAttachments?: boolean;
  retentionPolicy?: number;
  forceOcr?: boolean;
  allowedExtensions?: string[];
  splitPage?: number;
  disableDeskew?: boolean;
}

export interface UpdateMailboxParams {
  name?: string;
  aiEngine?: string;
  processAttachments?: boolean;
  retentionPolicy?: number | null;
  forceOcr?: boolean;
  allowedExtensions?: string[];
  splitPage?: number | null;
  disableDeskew?: boolean;
}

export interface CreateWebhookParams {
  event: string;
  target: string;
  name?: string;
  headers?: Record<string, string>;
  category?: string;
}

export interface UploadEmailParams {
  recipient: string;
  subject?: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  bodyHtml?: string;
  bodyPlain?: string;
  messageHeaders?: [string, string][];
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Parseur API key is required. Reconnect with a valid key.',
        {
          reason: 'missing_parseur_api_key'
        }
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.parseur.com',
      authHeader: { value: config.token },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Parseur',
          reason: 'parseur_api_error',
          detailKeys: ['message', 'detail', 'error', 'non_field_errors']
        })
    });
  }

  // ---- Mailbox (Parser) Management ----

  async listMailboxes(params?: ListMailboxesParams): Promise<PaginatedResponse<Mailbox>> {
    let response = await this.axios.get('/parser', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        search: params?.search,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async getMailbox(mailboxId: number): Promise<Mailbox> {
    let response = await this.axios.get(`/parser/${mailboxId}`);
    return response.data;
  }

  async createMailbox(params: CreateMailboxParams): Promise<Mailbox> {
    let body: Record<string, any> = {
      ai_engine: params.aiEngine || 'GCP_AI_2',
      identification_status: 'REQUESTED'
    };
    if (params.name) body.name = params.name;
    if (params.templateSlug) body.master_parser_slug = params.templateSlug;
    if (params.processAttachments !== undefined)
      body.process_attachments = params.processAttachments;
    if (params.retentionPolicy !== undefined) body.retention_policy = params.retentionPolicy;
    if (params.forceOcr !== undefined) body.force_ocr = params.forceOcr;
    if (params.allowedExtensions) body.allowed_extensions = params.allowedExtensions;
    if (params.splitPage !== undefined) body.split_page = params.splitPage;
    if (params.disableDeskew !== undefined) body.disable_deskew = params.disableDeskew;

    let response = await this.axios.post('/parser', body);
    return response.data;
  }

  async updateMailbox(mailboxId: number, params: UpdateMailboxParams): Promise<Mailbox> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.aiEngine !== undefined) body.ai_engine = params.aiEngine;
    if (params.processAttachments !== undefined)
      body.process_attachments = params.processAttachments;
    if (params.retentionPolicy !== undefined) body.retention_policy = params.retentionPolicy;
    if (params.forceOcr !== undefined) body.force_ocr = params.forceOcr;
    if (params.allowedExtensions !== undefined)
      body.allowed_extensions = params.allowedExtensions;
    if (params.splitPage !== undefined) body.split_page = params.splitPage;
    if (params.disableDeskew !== undefined) body.disable_deskew = params.disableDeskew;

    let response = await this.axios.put(`/parser/${mailboxId}`, body);
    return response.data;
  }

  async copyMailbox(mailboxId: number): Promise<NotificationResponse> {
    let response = await this.axios.post(`/parser/${mailboxId}/copy`);
    return response.data;
  }

  async deleteMailbox(mailboxId: number): Promise<void> {
    await this.axios.delete(`/parser/${mailboxId}`);
  }

  async getMailboxSchema(mailboxId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`/parser/${mailboxId}/schema`);
    return response.data;
  }

  // ---- Document Management ----

  async listDocuments(
    mailboxId: number,
    params?: ListDocumentsParams
  ): Promise<PaginatedResponse<Document>> {
    let response = await this.axios.get<PaginatedResponse<ApiDocument>>(
      `/parser/${mailboxId}/document_set`,
      {
        params: {
          page: params?.page,
          page_size: params?.pageSize,
          search: params?.search,
          ordering: params?.ordering,
          received_after: params?.receivedAfter,
          received_before: params?.receivedBefore,
          status: params?.status,
          tz: params?.tz,
          with_result: params?.withResult
        }
      }
    );
    return {
      ...response.data,
      results: response.data.results.map(normalizeDocument)
    };
  }

  async getDocument(documentId: number): Promise<Document> {
    let response = await this.axios.get<ApiDocument>(`/document/${documentId}`);
    return normalizeDocument(response.data);
  }

  async getDocumentLogs(
    documentId: number,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<DocumentLog>> {
    let response = await this.axios.get(`/document/${documentId}/log_set`, {
      params: {
        page: params?.page,
        page_size: params?.pageSize
      }
    });
    return response.data;
  }

  async uploadBinaryDocument(
    mailboxId: number,
    fileName: string,
    fileContent: Buffer | string,
    contentType?: string
  ): Promise<UploadResponse> {
    let formData = new FormData();
    let bytes = new Uint8Array(
      typeof fileContent === 'string' ? Buffer.from(fileContent) : fileContent
    );
    let blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
    formData.append('file', blob, fileName);

    let response = await this.axios.post(`/parser/${mailboxId}/upload`, formData);
    return response.data;
  }

  async uploadEmailDocument(params: UploadEmailParams): Promise<{ message: string }> {
    let body: Record<string, any> = {
      recipient: params.recipient
    };
    if (params.subject) body.subject = params.subject;
    if (params.from) body.from = params.from;
    if (params.to) body.to = params.to;
    if (params.cc) body.cc = params.cc;
    if (params.bcc) body.bcc = params.bcc;
    if (params.bodyHtml) body.body_html = params.bodyHtml;
    if (params.bodyPlain) body.body_plain = params.bodyPlain;
    if (params.messageHeaders) body.message_headers = params.messageHeaders;

    let response = await this.axios.post('/email', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async reprocessDocument(documentId: number): Promise<NotificationResponse> {
    let response = await this.axios.post(`/document/${documentId}/process`);
    return response.data;
  }

  async skipDocument(documentId: number): Promise<Document> {
    let response = await this.axios.post(`/document/${documentId}/skip`);
    return response.data;
  }

  async copyDocument(
    documentId: number,
    targetMailboxId: number
  ): Promise<NotificationResponse> {
    let response = await this.axios.post(`/document/${documentId}/copy/${targetMailboxId}`);
    return response.data;
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.axios.delete(`/document/${documentId}`);
  }

  // ---- Template Management ----

  async listTemplates(
    mailboxId: number,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<Template>> {
    let response = await this.axios.get(`/parser/${mailboxId}/template_set`, {
      params: {
        page: params?.page,
        page_size: params?.pageSize
      }
    });
    return response.data;
  }

  async getTemplate(templateId: number): Promise<Template> {
    let response = await this.axios.get(`/template/${templateId}`);
    return response.data;
  }

  async copyTemplate(
    templateId: number,
    targetMailboxId: number
  ): Promise<NotificationResponse> {
    let response = await this.axios.post(`/template/${templateId}/copy/${targetMailboxId}`);
    return response.data;
  }

  async deleteTemplate(templateId: number): Promise<void> {
    await this.axios.delete(`/template/${templateId}`);
  }

  // ---- Webhook Management ----

  async createWebhook(params: CreateWebhookParams): Promise<Webhook> {
    let body: Record<string, any> = {
      event: params.event,
      target: params.target,
      category: params.category || 'CUSTOM'
    };
    if (params.name) body.name = params.name;
    if (params.headers) body.headers = params.headers;

    let response = await this.axios.post('/webhook', body);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.axios.delete(`/webhook/${webhookId}`);
  }

  async enableWebhook(mailboxId: number, webhookId: number): Promise<Mailbox> {
    let response = await this.axios.post(`/parser/${mailboxId}/webhook_set/${webhookId}`);
    return response.data;
  }

  async disableWebhook(mailboxId: number, webhookId: number): Promise<Mailbox> {
    let response = await this.axios.delete(`/parser/${mailboxId}/webhook_set/${webhookId}`);
    return response.data;
  }
}
