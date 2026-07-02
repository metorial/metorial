import { createAxios } from 'slates';

let regionBaseUrls: Record<string, string> = {
  us: 'https://api.docugenerate.com/v1',
  eu: 'https://api.eu.docugenerate.com/v1',
  au: 'https://api.au.docugenerate.com/v1'
};

export interface TemplateResponse {
  id: string;
  created: number;
  updated: number;
  name: string;
  page_count: number;
  delimiters: {
    left: string;
    right: string;
  };
  tags: {
    valid: string[];
    invalid: string[];
  };
  filename: string;
  format: string;
  region: string;
  template_uri: string;
  preview_uri: string;
  image_uri: string;
  enhanced_syntax: boolean;
  versioning_enabled: boolean;
}

export interface DocumentResponse {
  id: string;
  template_id: string;
  created: number;
  name: string;
  data_length: number;
  filename: string;
  format: string;
  document_uri: string;
}

export interface GenerateDocumentParams {
  templateId: string;
  data: Record<string, unknown>[];
  name?: string;
  outputFormat?: string;
  outputQuality?: number;
  singleFile?: boolean;
  pageBreak?: boolean;
  attach?: string | string[];
  mergeWith?: string | string[];
}

export class DocuGenerateClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region: string }) {
    let baseURL = regionBaseUrls[config.region] || regionBaseUrls.us;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: config.token
      }
    });
  }

  // --- Templates ---

  async listTemplates(): Promise<TemplateResponse[]> {
    let response = await this.axios.get<TemplateResponse[]>('/template');
    return response.data;
  }

  async getTemplate(templateId: string): Promise<TemplateResponse> {
    let response = await this.axios.get<TemplateResponse>(`/template/${templateId}`);
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    params: {
      name?: string;
      enhancedSyntax?: boolean;
      versioningEnabled?: boolean;
    }
  ): Promise<TemplateResponse> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.enhancedSyntax !== undefined) body.enhanced_syntax = params.enhancedSyntax;
    if (params.versioningEnabled !== undefined)
      body.versioning_enabled = params.versioningEnabled;

    let response = await this.axios.put<TemplateResponse>(`/template/${templateId}`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/template/${templateId}`);
  }

  // --- Documents ---

  async generateDocument(params: GenerateDocumentParams): Promise<DocumentResponse[]> {
    let body: Record<string, unknown> = {
      template_id: params.templateId,
      data: params.data
    };

    if (params.name !== undefined) body.name = params.name;
    if (params.outputFormat !== undefined) body.output_format = params.outputFormat;
    if (params.outputQuality !== undefined) body.output_quality = params.outputQuality;
    if (params.singleFile !== undefined) body.single_file = params.singleFile;
    if (params.pageBreak !== undefined) body.page_break = params.pageBreak;
    if (params.attach !== undefined) body.attach = params.attach;
    if (params.mergeWith !== undefined) body.merge_with = params.mergeWith;

    let response = await this.axios.post<DocumentResponse | DocumentResponse[]>(
      '/document',
      body,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // API may return a single document or an array depending on input
    let data = response.data;
    return Array.isArray(data) ? data : [data];
  }

  async listDocuments(templateId: string): Promise<DocumentResponse[]> {
    let response = await this.axios.get<DocumentResponse[]>('/document', {
      params: { template_id: templateId }
    });
    return response.data;
  }

  async getDocument(documentId: string): Promise<DocumentResponse> {
    let response = await this.axios.get<DocumentResponse>(`/document/${documentId}`);
    return response.data;
  }

  async updateDocument(
    documentId: string,
    params: { name?: string }
  ): Promise<DocumentResponse> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;

    let response = await this.axios.put<DocumentResponse>(`/document/${documentId}`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.axios.delete(`/document/${documentId}`);
  }
}
