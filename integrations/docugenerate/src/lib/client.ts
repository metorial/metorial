import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  requestAxiosData
} from 'slates';

let regionBaseUrls: Record<string, string> = {
  us: 'https://api.docugenerate.com/v1',
  eu: 'https://api.eu.docugenerate.com/v1',
  uk: 'https://api.uk.docugenerate.com/v1',
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
    valid: (string | Record<string, unknown>)[];
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
  folder: string[];
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
  outputName?: string;
  outputFormat?: string;
  outputQuality?: number;
  singleFile?: boolean;
  pageBreak?: boolean;
  attach?: string | string[];
  mergeWith?: string | string[];
}

export interface TemplateParams {
  fileUrl?: string;
  filename?: string;
  name?: string;
  delimiters?: { left: string; right: string };
  folder?: string[];
  region?: string;
  enhancedSyntax?: boolean;
  versioningEnabled?: boolean;
}

export let formatValidTags = (tags: TemplateResponse['tags']['valid']) =>
  tags.map(tag => (typeof tag === 'string' ? tag : JSON.stringify(tag)));

export let fileMimeType = (format: string): string | undefined => {
  let mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.pdf/a-1b': 'application/pdf',
    '.pdf/a-2b': 'application/pdf',
    '.pdf/a-3b': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.rtf': 'application/rtf',
    '.txt': 'text/plain',
    '.sql': 'application/sql',
    '.html': 'text/html',
    '.png': 'image/png',
    '.zip': 'application/zip'
  };
  return mimeTypes[format.toLowerCase()];
};

export class DocuGenerateClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; region: string }) {
    let baseURL = regionBaseUrls[config.region];
    if (!baseURL) {
      throw createApiServiceError('Select a supported DocuGenerate processing region.');
    }
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A DocuGenerate API key is required. Reconnect your account.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL,
      authHeader: { value: config.token },
      contentType: false,
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DocuGenerate',
          reason: 'docugenerate_api_error'
        })
    });
  }

  private async templateForm(params: TemplateParams): Promise<FormData> {
    let form = new FormData();
    if (params.fileUrl !== undefined) {
      if (!params.filename || !/\.(docx|doc|odt|rtf|txt|sql)$/i.test(params.filename)) {
        throw createApiServiceError(
          'Provide a template filename ending in .docx, .doc, .odt, .rtf, .txt, or .sql.'
        );
      }
      let source: URL;
      try {
        source = new URL(params.fileUrl);
      } catch {
        throw createApiServiceError('Provide a valid public HTTP or HTTPS template file URL.');
      }
      if (
        !['https:', 'http:'].includes(source.protocol) ||
        source.username ||
        source.password
      ) {
        throw createApiServiceError(
          'Provide a public HTTP or HTTPS template file URL without credentials.'
        );
      }
      let file = await requestAxiosData(
        'download template source',
        () =>
          createAxios().get<ArrayBuffer>(source.toString(), { responseType: 'arraybuffer' }),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'Template source',
            reason: 'docugenerate_template_source_error',
            operation
          })
      );
      let bytes = new Uint8Array(file);
      if (bytes.byteLength === 0) {
        throw createApiServiceError(
          'The template source file is empty. Provide a valid template.'
        );
      }
      form.append('file', new Blob([bytes]), params.filename);
    } else if (params.filename !== undefined) {
      throw createApiServiceError('Provide fileUrl when specifying a template filename.');
    }
    if (params.name !== undefined) form.append('name', params.name);
    if (params.delimiters !== undefined)
      form.append('delimiters', JSON.stringify(params.delimiters));
    if (params.folder !== undefined) {
      if (params.folder.length === 0) form.append('folder', '[]');
      else for (let folder of params.folder) form.append('folder', folder);
    }
    if (params.region !== undefined) form.append('region', params.region);
    if (params.enhancedSyntax !== undefined)
      form.append('enhanced_syntax', String(params.enhancedSyntax));
    if (params.versioningEnabled !== undefined)
      form.append('versioning_enabled', String(params.versioningEnabled));
    return form;
  }

  async createTemplate(
    params: TemplateParams & { fileUrl: string; filename: string }
  ): Promise<TemplateResponse> {
    let form = await this.templateForm(params);
    let response = await this.axios.post<TemplateResponse>('/template', form);
    return response.data;
  }

  async listTemplates(): Promise<TemplateResponse[]> {
    let response = await this.axios.get<TemplateResponse[]>('/template');
    return response.data;
  }

  async getTemplate(templateId: string): Promise<TemplateResponse> {
    let response = await this.axios.get<TemplateResponse>(
      `/template/${encodeURIComponent(templateId)}`
    );
    return response.data;
  }

  async updateTemplate(templateId: string, params: TemplateParams): Promise<TemplateResponse> {
    if (Object.values(params).every(value => value === undefined)) {
      throw createApiServiceError('Provide at least one template field to update.');
    }
    let form = await this.templateForm(params);
    let response = await this.axios.put<TemplateResponse>(
      `/template/${encodeURIComponent(templateId)}`,
      form
    );
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/template/${encodeURIComponent(templateId)}`);
  }

  async generateDocument(params: GenerateDocumentParams): Promise<DocumentResponse[]> {
    if (params.data.length === 0) {
      throw createApiServiceError('Provide at least one data object to generate a document.');
    }
    if (params.outputQuality !== undefined && !Number.isInteger(params.outputQuality)) {
      throw createApiServiceError('outputQuality must be a whole number between 1 and 100.');
    }
    if (
      (params.attach !== undefined || params.mergeWith !== undefined) &&
      !(params.outputFormat ?? '.docx').startsWith('.pdf')
    ) {
      throw createApiServiceError('Choose a PDF outputFormat when using attach or mergeWith.');
    }
    let body: Record<string, unknown> = {
      template_id: params.templateId,
      data: params.data
    };

    if (params.name !== undefined) body.name = params.name;
    if (params.outputName !== undefined) body.output_name = params.outputName;
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
    let response = await this.axios.get<DocumentResponse>(
      `/document/${encodeURIComponent(documentId)}`
    );
    return response.data;
  }

  async updateDocument(
    documentId: string,
    params: { name?: string }
  ): Promise<DocumentResponse> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;

    let response = await this.axios.put<DocumentResponse>(
      `/document/${encodeURIComponent(documentId)}`,
      body,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.axios.delete(`/document/${encodeURIComponent(documentId)}`);
  }
}
