import { createAxios } from 'slates';
import {
  applyPdfmonkeyApiErrorInterceptor,
  pdfmonkeyApiError,
  pdfmonkeyServiceError
} from './errors';

export interface DocumentCreateParams {
  templateId: string;
  status?: 'draft' | 'pending';
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface DocumentUpdateParams {
  status?: 'pending';
  templateId?: string;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface TemplateCreateParams {
  workspaceId: string;
  identifier: string;
  body?: string;
  bodyDraft?: string;
  scssStyle?: string;
  scssStyleDraft?: string;
  sampleData?: string;
  sampleDataDraft?: string;
  settings?: Record<string, unknown>;
  settingsDraft?: Record<string, unknown>;
  editionMode?: 'code' | 'builder';
  outputType?: 'pdf' | 'image';
  pdfEngineId?: string;
  pdfEngineDraftId?: string;
  templateFolderId?: string | null;
  documentTtl?: number;
}

export interface TemplateUpdateParams {
  identifier?: string;
  body?: string;
  bodyDraft?: string;
  scssStyle?: string;
  scssStyleDraft?: string;
  sampleData?: string;
  sampleDataDraft?: string;
  settings?: Record<string, unknown>;
  settingsDraft?: Record<string, unknown>;
  editionMode?: 'code' | 'builder';
  outputType?: 'pdf' | 'image';
  pdfEngineId?: string;
  pdfEngineDraftId?: string;
  templateFolderId?: string | null;
  documentTtl?: number;
}

export interface ListDocumentsParams {
  page?: number;
  templateId?: string;
  status?: string;
  updatedSince?: string;
}

export interface ListTemplatesParams {
  workspaceId: string;
  folders?: string;
  page?: number;
  sort?: 'identifier' | 'created_at' | 'updated_at';
}

export interface DownloadedDocumentFile {
  document: Record<string, unknown>;
  contentBase64: string;
  mimeType: string;
  byteLength: number;
  filename: string | null;
}

let getHeader = (headers: unknown, key: string) => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  let lowerKey = key.toLowerCase();
  for (let [headerKey, value] of Object.entries(headers as Record<string, unknown>)) {
    if (headerKey.toLowerCase() === lowerKey) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return undefined;
};

let toBuffer = (data: unknown) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof data === 'string') {
    return Buffer.from(data);
  }

  return Buffer.from([]);
};

let defaultMimeTypeFor = (document: Record<string, unknown>) => {
  let filename = typeof document.filename === 'string' ? document.filename.toLowerCase() : '';

  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';

  return 'application/pdf';
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private downloadAxios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.pdfmonkey.io/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
    applyPdfmonkeyApiErrorInterceptor(this.axios);

    this.downloadAxios = createAxios({});
    applyPdfmonkeyApiErrorInterceptor(this.downloadAxios);
  }

  // === Current User ===

  async getCurrentUser(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/current_user');
    return response.data.current_user;
  }

  // === Documents ===

  async listDocuments(
    params?: ListDocumentsParams
  ): Promise<{ documents: Record<string, unknown>[]; meta: Record<string, unknown> }> {
    let queryParams: Record<string, string> = {};

    if (params?.page) {
      queryParams['page[number]'] = String(params.page);
    }
    if (params?.templateId) {
      queryParams['q[document_template_id][]'] = params.templateId;
    }
    if (params?.status) {
      queryParams['q[status]'] = params.status;
    }
    if (params?.updatedSince) {
      queryParams['q[updated_since]'] = params.updatedSince;
    }

    let response = await this.axios.get('/document_cards', { params: queryParams });
    return {
      documents: response.data.document_cards,
      meta: response.data.meta
    };
  }

  async getDocumentCard(documentId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/document_cards/${documentId}`);
    return response.data.document_card;
  }

  async getDocument(documentId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/documents/${documentId}`);
    return response.data.document;
  }

  async createDocument(params: DocumentCreateParams): Promise<Record<string, unknown>> {
    let document: Record<string, unknown> = {
      document_template_id: params.templateId,
      status: params.status || 'pending'
    };

    if (params.payload !== undefined) {
      document.payload = params.payload;
    }

    if (params.meta !== undefined) {
      document.meta = params.meta;
    }

    let response = await this.axios.post('/documents', { document });
    return response.data.document;
  }

  async createDocumentSync(params: DocumentCreateParams): Promise<Record<string, unknown>> {
    let document: Record<string, unknown> = {
      document_template_id: params.templateId,
      status: params.status || 'pending'
    };

    if (params.payload !== undefined) {
      document.payload = params.payload;
    }

    if (params.meta !== undefined) {
      document.meta = params.meta;
    }

    let response = await this.axios.post('/documents/sync', { document });
    return response.data.document_card;
  }

  async updateDocument(
    documentId: string,
    params: DocumentUpdateParams
  ): Promise<Record<string, unknown>> {
    let docData: Record<string, unknown> = {};

    if (params.status !== undefined) {
      docData.status = params.status;
    }
    if (params.templateId !== undefined) {
      docData.document_template_id = params.templateId;
    }
    if (params.payload !== undefined) {
      docData.payload = params.payload;
    }
    if (params.meta !== undefined) {
      docData.meta = params.meta;
    }

    if (Object.keys(docData).length === 0) {
      throw pdfmonkeyServiceError('Provide at least one document field to update.');
    }

    let response = await this.axios.put(`/documents/${documentId}`, { document: docData });
    return response.data.document;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.axios.delete(`/documents/${documentId}`);
  }

  async downloadDocumentFile(documentId: string): Promise<DownloadedDocumentFile> {
    let document = await this.getDocumentCard(documentId);
    let status =
      typeof document.status === 'string' ? document.status : String(document.status);

    if (status !== 'success') {
      throw pdfmonkeyServiceError(
        `Document ${documentId} is not ready to download. Current status: ${status}.`
      );
    }

    if (typeof document.download_url !== 'string' || document.download_url.length === 0) {
      throw pdfmonkeyServiceError(
        `Document ${documentId} does not include a download URL. Fetch the document again after generation succeeds.`
      );
    }

    try {
      let response = await this.downloadAxios.get(document.download_url, {
        responseType: 'arraybuffer'
      });
      let buffer = toBuffer(response.data);
      let contentType = getHeader(response.headers, 'content-type');
      let mimeType =
        typeof contentType === 'string' && contentType.length > 0
          ? contentType.split(';')[0]!
          : defaultMimeTypeFor(document);

      return {
        document,
        contentBase64: buffer.toString('base64'),
        mimeType,
        byteLength: buffer.byteLength,
        filename: document.filename ? String(document.filename) : null
      };
    } catch (error) {
      throw pdfmonkeyApiError(error, 'download document file');
    }
  }

  // === Templates ===

  async listTemplates(
    params: ListTemplatesParams
  ): Promise<{ templates: Record<string, unknown>[]; meta: Record<string, unknown> }> {
    let queryParams: Record<string, string> = {
      'q[workspace_id]': params.workspaceId
    };

    if (params.page) {
      queryParams.page = String(params.page);
    }
    if (params.folders) {
      queryParams['q[folders]'] = params.folders;
    }
    if (params.sort) {
      queryParams.sort = params.sort;
    }

    let response = await this.axios.get('/document_template_cards', { params: queryParams });
    return {
      templates: response.data.document_template_cards,
      meta: response.data.meta
    };
  }

  async getTemplate(templateId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/document_templates/${templateId}`);
    return response.data.document_template;
  }

  async createTemplate(params: TemplateCreateParams): Promise<Record<string, unknown>> {
    let templateData: Record<string, unknown> = {
      app_id: params.workspaceId,
      identifier: params.identifier
    };

    if (params.editionMode !== undefined) templateData.edition_mode = params.editionMode;
    if (params.outputType !== undefined) templateData.output_type = params.outputType;
    if (params.pdfEngineId !== undefined) templateData.pdf_engine_id = params.pdfEngineId;
    if (params.pdfEngineDraftId !== undefined)
      templateData.pdf_engine_draft_id = params.pdfEngineDraftId;
    if (params.body !== undefined) templateData.body = params.body;
    if (params.bodyDraft !== undefined) templateData.body_draft = params.bodyDraft;
    if (params.scssStyle !== undefined) templateData.scss_style = params.scssStyle;
    if (params.scssStyleDraft !== undefined)
      templateData.scss_style_draft = params.scssStyleDraft;
    if (params.sampleData !== undefined) templateData.sample_data = params.sampleData;
    if (params.sampleDataDraft !== undefined)
      templateData.sample_data_draft = params.sampleDataDraft;
    if (params.settings !== undefined) templateData.settings = params.settings;
    if (params.settingsDraft !== undefined) templateData.settings_draft = params.settingsDraft;
    if (params.templateFolderId !== undefined)
      templateData.template_folder_id = params.templateFolderId;
    if (params.documentTtl !== undefined) templateData.ttl = params.documentTtl;

    let response = await this.axios.post('/document_templates', {
      document_template: templateData
    });
    return response.data.document_template;
  }

  async updateTemplate(
    templateId: string,
    params: TemplateUpdateParams
  ): Promise<Record<string, unknown>> {
    let templateData: Record<string, unknown> = {};

    if (params.identifier !== undefined) templateData.identifier = params.identifier;
    if (params.editionMode !== undefined) templateData.edition_mode = params.editionMode;
    if (params.outputType !== undefined) templateData.output_type = params.outputType;
    if (params.pdfEngineId !== undefined) templateData.pdf_engine_id = params.pdfEngineId;
    if (params.pdfEngineDraftId !== undefined)
      templateData.pdf_engine_draft_id = params.pdfEngineDraftId;
    if (params.body !== undefined) templateData.body = params.body;
    if (params.bodyDraft !== undefined) templateData.body_draft = params.bodyDraft;
    if (params.scssStyle !== undefined) templateData.scss_style = params.scssStyle;
    if (params.scssStyleDraft !== undefined)
      templateData.scss_style_draft = params.scssStyleDraft;
    if (params.sampleData !== undefined) templateData.sample_data = params.sampleData;
    if (params.sampleDataDraft !== undefined)
      templateData.sample_data_draft = params.sampleDataDraft;
    if (params.settings !== undefined) templateData.settings = params.settings;
    if (params.settingsDraft !== undefined) templateData.settings_draft = params.settingsDraft;
    if (params.templateFolderId !== undefined)
      templateData.template_folder_id = params.templateFolderId;
    if (params.documentTtl !== undefined) templateData.ttl = params.documentTtl;

    if (Object.keys(templateData).length === 0) {
      throw pdfmonkeyServiceError('Provide at least one template field to update.');
    }

    let response = await this.axios.put(`/document_templates/${templateId}`, {
      document_template: templateData
    });
    return response.data.document_template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/document_templates/${templateId}`);
  }

  // === Engines ===

  async listEngines(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/engines');
    return response.data.pdf_engines;
  }
}
