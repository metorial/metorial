import { createAxios } from 'slates';
import { applyDocparserApiErrorInterceptor } from './errors';

export interface DocparserParser {
  parserId: string;
  label: string;
}

export interface ModelLayout {
  layoutId: string;
  label: string;
  [key: string]: any;
}

export interface ImportResult {
  documentId: string;
  parserId?: string;
  remoteId?: string;
  fileSize?: number;
  pageCount: number;
  uploadDuration: number;
  quotaUsed: number;
  quotaLeft: number;
  quotaRefill: string;
  message?: string;
}

export interface DocumentStatus {
  documentId: string;
  token?: string;
  fileSource?: string;
  filename?: string;
  mimeType?: string;
  pages?: number;
  supported?: boolean;
  importingInProgress?: boolean;
  processingInProgress?: boolean;
  webhookDispatchingInProgress?: boolean;
  uploadedAt: string;
  importedAt: string;
  ocrAt: string;
  preprocessedAt: string;
  parsedAt: string;
  firstProcessedAt: string;
  webhookAt: string;
  dispatchedWebhook?: boolean;
  dispatchedWebhookProblem?: boolean;
  failedJobs: any[];
  [key: string]: any;
}

export type ParsedDataSortBy =
  | 'parsed_at'
  | 'processed_at'
  | 'uploaded_at'
  | 'first_processed_at'
  | 'imported_at'
  | 'integrated_at'
  | 'dispatched_webhook_at'
  | 'preprocessed_at';

export interface ParsedDataOptions {
  format?: 'object' | 'flat';
  list?: 'last_uploaded' | 'uploaded_after' | 'processed_after';
  date?: string;
  remoteId?: string;
  sortBy?: ParsedDataSortBy;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  includeProcessingQueue?: boolean;
}

export interface ParsedDocumentOptions {
  format?: 'object' | 'flat';
  includeChildren?: boolean;
}

export interface ReparseResult {
  totalReparsed: number;
  message: string;
}

export interface ReintegrateResult {
  totalReintegrated: number;
  message: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.docparser.com',
      auth: {
        username: config.token,
        password: ''
      }
    });
    applyDocparserApiErrorInterceptor(this.axios);
  }

  async ping(): Promise<{ msg: string }> {
    let response = await this.axios.get('/v1/ping');
    return response.data;
  }

  async listParsers(): Promise<DocparserParser[]> {
    let response = await this.axios.get('/v1/parsers');
    return (response.data || []).map((p: any) => ({
      parserId: p.id,
      label: p.label
    }));
  }

  async listModelLayouts(parserId: string): Promise<ModelLayout[]> {
    let response = await this.axios.get(`/v1/parser/models/${parserId}`);
    return (response.data || []).map((l: any) => ({
      layoutId: l.id,
      label: l.label,
      ...l
    }));
  }

  async importFileByUpload(
    parserId: string,
    fileContent: string,
    fileName: string,
    remoteId?: string
  ): Promise<ImportResult> {
    let formData = new FormData();
    let blob = new Blob([Buffer.from(fileContent, 'base64')]);
    formData.append('file', blob, fileName);
    if (remoteId) {
      formData.append('remote_id', remoteId);
    }

    let response = await this.axios.post(`/v1/document/upload/${parserId}`, formData);

    return this.mapImportResult(response.data);
  }

  async importFileByBase64(
    parserId: string,
    fileContent: string,
    fileName?: string,
    remoteId?: string
  ): Promise<ImportResult> {
    let formData = new FormData();
    formData.append('file_content', fileContent);
    if (fileName) {
      formData.append('file_name', fileName);
    }
    if (remoteId) {
      formData.append('remote_id', remoteId);
    }

    let response = await this.axios.post(`/v1/document/upload/${parserId}`, formData);
    return this.mapImportResult(response.data);
  }

  async importFileByUrl(
    parserId: string,
    fileUrl: string,
    remoteId?: string
  ): Promise<ImportResult> {
    let formData = new FormData();
    formData.append('url', fileUrl);
    if (remoteId) {
      formData.append('remote_id', remoteId);
    }

    let response = await this.axios.post(`/v2/document/fetch/${parserId}`, formData);
    return this.mapImportResult(response.data);
  }

  async getDocumentStatus(parserId: string, documentId: string): Promise<DocumentStatus> {
    let response = await this.axios.get(`/v2/document/status/${parserId}/${documentId}`);
    let data = response.data;
    return {
      documentId,
      token: data.token,
      fileSource: data.file_source,
      filename: data.filename ?? data.file_name,
      mimeType: data.mime_type,
      pages: data.pages,
      supported: data.supported,
      importingInProgress: data.importing_in_progress,
      processingInProgress: data.processing_in_progress,
      webhookDispatchingInProgress: data.webhook_dispatching_in_progress,
      uploadedAt: this.mapTimestamp(data.uploaded_at),
      importedAt: this.mapTimestamp(data.imported_at),
      ocrAt: this.mapTimestamp(data.ocr_at ?? data.ocr_started_at),
      preprocessedAt: this.mapTimestamp(data.preprocessed_at),
      parsedAt: this.mapTimestamp(data.parsed_at ?? data.processed_at),
      firstProcessedAt: this.mapTimestamp(data.first_processed_at),
      webhookAt: this.mapTimestamp(data.webhook_at ?? data.dispatched_webhook_at),
      dispatchedWebhook: data.dispatched_webhook,
      dispatchedWebhookProblem: data.dispatched_webhook_problem,
      failedJobs: data.failed_jobs || [],
      ...data
    };
  }

  async getParsedDataByDocument(
    parserId: string,
    documentId: string,
    options?: ParsedDocumentOptions
  ): Promise<any[]> {
    let params: Record<string, string | boolean> = {};
    if (options?.format) {
      params.format = options.format;
    }
    if (options?.includeChildren) {
      params.include_children = options.includeChildren;
    }

    let response = await this.axios.get(`/v1/results/${parserId}/${documentId}`, { params });
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  async getParsedDataByParser(parserId: string, options?: ParsedDataOptions): Promise<any[]> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.format) params.format = options.format;
    if (options?.list) params.list = options.list;
    if (options?.date) params.date = options.date;
    if (options?.remoteId) params.remote_id = options.remoteId;
    if (options?.sortBy) params.sort_by = options.sortBy;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.limit) params.limit = options.limit;
    if (options?.includeProcessingQueue) {
      params.include_processing_queue = options.includeProcessingQueue;
    }

    let response = await this.axios.get(`/v1/results/${parserId}`, { params });
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  async reparseDocuments(parserId: string, documentIds: string[]): Promise<ReparseResult> {
    let formData = new FormData();
    for (let documentId of documentIds) {
      formData.append('document_ids[]', documentId);
    }

    let response = await this.axios.post(`/v1/document/reparse/${parserId}`, formData);
    return {
      totalReparsed: Number(response.data?.total_reparsed ?? documentIds.length),
      message: typeof response.data?.msg === 'string' ? response.data.msg : ''
    };
  }

  async reintegrateDocuments(
    parserId: string,
    documentIds: string[]
  ): Promise<ReintegrateResult> {
    let formData = new FormData();
    for (let documentId of documentIds) {
      formData.append('document_ids[]', documentId);
    }

    let response = await this.axios.post(`/v1/document/reintegrate/${parserId}`, formData);
    return {
      totalReintegrated: Number(response.data?.total_reintegrate ?? documentIds.length),
      message: typeof response.data?.msg === 'string' ? response.data.msg : ''
    };
  }

  private mapImportResult(data: any): ImportResult {
    return {
      documentId: String(data.id ?? data.document_id ?? ''),
      parserId: data.parser_id,
      remoteId: data.remote_id,
      fileSize: data.file_size,
      pageCount: Number(data.page_count ?? data.pages ?? 0),
      uploadDuration: Number(data.upload_duration ?? 0),
      quotaUsed: Number(data.quota_used ?? 0),
      quotaLeft: Number(data.quota_left ?? 0),
      quotaRefill: data.quota_refill || '',
      message: data.message
    };
  }

  private mapTimestamp(value: unknown) {
    if (typeof value === 'number') {
      return value > 0 ? new Date(value * 1000).toISOString() : '';
    }

    if (typeof value === 'string') {
      return value;
    }

    return '';
  }
}
