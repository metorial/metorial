import { createAxios } from 'slates';

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
  pageCount: number;
  uploadDuration: number;
  quotaUsed: number;
  quotaLeft: number;
  quotaRefill: string;
}

export interface DocumentStatus {
  documentId: string;
  uploadedAt: string;
  importedAt: string;
  ocrAt: string;
  preprocessedAt: string;
  parsedAt: string;
  webhookAt: string;
  failedJobs: any[];
  [key: string]: any;
}

export interface ParsedDataOptions {
  format?: 'object' | 'flat';
  list?: 'last_uploaded' | 'uploaded_after' | 'processed_after';
  remoteId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  includeChildren?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.docparser.com/v1',
      auth: {
        username: config.token,
        password: ''
      }
    });
  }

  async ping(): Promise<{ msg: string }> {
    let response = await this.axios.get('/ping');
    return response.data;
  }

  async listParsers(): Promise<DocparserParser[]> {
    let response = await this.axios.get('/parsers');
    return (response.data || []).map((p: any) => ({
      parserId: p.id,
      label: p.label
    }));
  }

  async listModelLayouts(parserId: string): Promise<ModelLayout[]> {
    let response = await this.axios.get(`/parser/layouts/${parserId}`);
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

    let response = await this.axios.post(`/document/upload/${parserId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return this.mapImportResult(response.data);
  }

  async importFileByBase64(
    parserId: string,
    fileContent: string,
    fileName?: string,
    remoteId?: string
  ): Promise<ImportResult> {
    let body: Record<string, string> = {
      file_content: fileContent
    };
    if (fileName) {
      body.file_name = fileName;
    }
    if (remoteId) {
      body.remote_id = remoteId;
    }

    let response = await this.axios.post(`/document/upload/${parserId}`, body);
    return this.mapImportResult(response.data);
  }

  async importFileByUrl(
    parserId: string,
    fileUrl: string,
    remoteId?: string
  ): Promise<ImportResult> {
    let body: Record<string, string> = {
      url: fileUrl
    };
    if (remoteId) {
      body.remote_id = remoteId;
    }

    let response = await this.axios.post(`/document/fetch/${parserId}`, body);
    return this.mapImportResult(response.data);
  }

  async getDocumentStatus(parserId: string, documentId: string): Promise<DocumentStatus> {
    let response = await this.axios.get(`/document/status/${parserId}/${documentId}`);
    let data = response.data;
    return {
      documentId: data.id || documentId,
      uploadedAt: data.uploaded_at || '',
      importedAt: data.imported_at || '',
      ocrAt: data.ocr_at || '',
      preprocessedAt: data.preprocessed_at || '',
      parsedAt: data.parsed_at || '',
      webhookAt: data.webhook_at || '',
      failedJobs: data.failed_jobs || [],
      ...data
    };
  }

  async getParsedDataByDocument(
    parserId: string,
    documentId: string,
    format?: 'object' | 'flat'
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (format) {
      params.format = format;
    }

    let response = await this.axios.get(`/results/${parserId}/${documentId}`, { params });
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  async getParsedDataByParser(parserId: string, options?: ParsedDataOptions): Promise<any[]> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.format) params.format = options.format;
    if (options?.list) params.list = options.list;
    if (options?.remoteId) params.remote_id = options.remoteId;
    if (options?.sort) params.sort = options.sort;
    if (options?.order) params.order = options.order;
    if (options?.limit) params.limit = options.limit;
    if (options?.includeChildren) params.include_children = options.includeChildren;

    let response = await this.axios.get(`/results/${parserId}`, { params });
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  async reparseDocuments(parserId: string, documentIds: string[]): Promise<any> {
    let response = await this.axios.post(`/document/reparse/${parserId}`, {
      document_ids: documentIds
    });
    return response.data;
  }

  async reintegrateDocuments(parserId: string, documentIds: string[]): Promise<any> {
    let response = await this.axios.post(`/document/reintegrate/${parserId}`, {
      document_ids: documentIds
    });
    return response.data;
  }

  private mapImportResult(data: any): ImportResult {
    return {
      documentId: data.id || '',
      pageCount: data.page_count ?? 0,
      uploadDuration: data.upload_duration ?? 0,
      quotaUsed: data.quota_used ?? 0,
      quotaLeft: data.quota_left ?? 0,
      quotaRefill: data.quota_refill || ''
    };
  }
}
