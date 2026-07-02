import { createAxios } from 'slates';

export interface DocumentCreateParams {
  templateId: string;
  status?: 'draft' | 'pending';
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface DocumentUpdateParams {
  status?: 'draft' | 'pending';
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
  editionMode?: 'code' | 'visual';
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
  editionMode?: 'code' | 'visual';
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

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.pdfmonkey.io/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
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
    let body: Record<string, unknown> = {
      document: {
        document_template_id: params.templateId,
        status: params.status || 'pending'
      }
    };

    if (params.payload !== undefined) {
      (body.document as Record<string, unknown>).payload =
        typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload);
    }

    if (params.meta !== undefined) {
      (body.document as Record<string, unknown>).meta =
        typeof params.meta === 'string' ? params.meta : JSON.stringify(params.meta);
    }

    let response = await this.axios.post('/documents', body);
    return response.data.document;
  }

  async createDocumentSync(params: DocumentCreateParams): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      document: {
        document_template_id: params.templateId,
        status: params.status || 'pending'
      }
    };

    if (params.payload !== undefined) {
      (body.document as Record<string, unknown>).payload =
        typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload);
    }

    if (params.meta !== undefined) {
      (body.document as Record<string, unknown>).meta =
        typeof params.meta === 'string' ? params.meta : JSON.stringify(params.meta);
    }

    let response = await this.axios.post('/documents/sync', body);
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
      docData.payload =
        typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload);
    }
    if (params.meta !== undefined) {
      docData.meta =
        typeof params.meta === 'string' ? params.meta : JSON.stringify(params.meta);
    }

    let response = await this.axios.put(`/documents/${documentId}`, { document: docData });
    return response.data.document;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.axios.delete(`/documents/${documentId}`);
  }

  // === Templates ===

  async listTemplates(
    params: ListTemplatesParams
  ): Promise<{ templates: Record<string, unknown>[]; meta: Record<string, unknown> }> {
    let queryParams: Record<string, string> = {
      'q[workspaceId]': params.workspaceId
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
    if (params.documentTtl !== undefined) templateData.document_ttl = params.documentTtl;

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
    if (params.documentTtl !== undefined) templateData.document_ttl = params.documentTtl;

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
