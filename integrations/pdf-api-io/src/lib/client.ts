import { createAxios } from 'slates';
import { pdfApiIoApiError, pdfApiIoServiceError } from './errors';

let http = createAxios({
  baseURL: 'https://pdf-api.io/api'
});

export interface TemplateVariable {
  name: string;
  type: string;
}

export interface TemplateMeta {
  description?: string;
  [key: string]: unknown;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  created_at: string;
  meta: TemplateMeta;
  variables: TemplateVariable[];
  team_name?: string;
  team_id?: string;
}

export interface MergeTemplateEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface JsonPdfResponse {
  status?: number;
  data?: string;
  url?: string;
}

export type PdfOutputOption = 'pdf' | 'url';

export type PdfResult =
  | {
      kind: 'attachment';
      contentBase64: string;
      mimeType: 'application/pdf';
      byteLength: number;
    }
  | {
      kind: 'url';
      url: string;
      mimeType: null;
      byteLength: null;
    };

let decodedByteLength = (contentBase64: string) => {
  let byteLength = Buffer.byteLength(contentBase64, 'base64');

  if (byteLength <= 0) {
    throw pdfApiIoServiceError('PDF-API.io returned empty PDF content.');
  }

  return byteLength;
};

let normalizePdfResponse = (
  response: JsonPdfResponse,
  output: PdfOutputOption,
  operation: string
): PdfResult => {
  if (typeof response.status === 'number' && response.status >= 400) {
    throw pdfApiIoServiceError(`PDF-API.io API ${operation} failed: HTTP ${response.status}.`);
  }

  if (output === 'url') {
    let url = response.url ?? response.data;

    if (typeof url !== 'string' || !url.startsWith('http')) {
      throw pdfApiIoServiceError(
        `PDF-API.io API ${operation} did not return a valid download URL.`
      );
    }

    return {
      kind: 'url',
      url,
      mimeType: null,
      byteLength: null
    };
  }

  if (typeof response.data !== 'string' || response.data.length === 0) {
    throw pdfApiIoServiceError(`PDF-API.io API ${operation} did not return PDF content.`);
  }

  return {
    kind: 'attachment',
    contentBase64: response.data,
    mimeType: 'application/pdf',
    byteLength: decodedByteLength(response.data)
  };
};

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  async listTemplates(): Promise<Template[]> {
    try {
      let response = await http.get<Template[]>('/templates', {
        headers: this.headers()
      });

      if (!Array.isArray(response.data)) {
        throw pdfApiIoServiceError(
          'PDF-API.io API list templates returned an invalid response.'
        );
      }

      return response.data;
    } catch (error) {
      throw pdfApiIoApiError(error, 'list templates');
    }
  }

  async getTemplate(templateId: string): Promise<Template> {
    try {
      let response = await http.get<Template>(`/templates/${templateId}`, {
        headers: this.headers()
      });

      if (!response.data || typeof response.data !== 'object') {
        throw pdfApiIoServiceError(
          'PDF-API.io API get template returned an invalid response.'
        );
      }

      return response.data;
    } catch (error) {
      throw pdfApiIoApiError(error, 'get template');
    }
  }

  async generatePdf(
    templateId: string,
    data: Record<string, unknown>,
    options?: { output?: PdfOutputOption }
  ): Promise<PdfResult> {
    let output = options?.output ?? 'pdf';
    let body: Record<string, unknown> = { data };
    if (output === 'url') {
      body.output = 'url';
    }

    try {
      let response = await http.post<JsonPdfResponse>(`/templates/${templateId}/pdf`, body, {
        headers: this.headers({
          Accept: 'application/json'
        })
      });

      return normalizePdfResponse(response.data, output, 'render template');
    } catch (error) {
      throw pdfApiIoApiError(error, 'render template');
    }
  }

  async mergeTemplates(
    templates: MergeTemplateEntry[],
    options?: { output?: PdfOutputOption }
  ): Promise<PdfResult> {
    let output = options?.output ?? 'pdf';
    let body: Record<string, unknown> = { templates };
    if (output === 'url') {
      body.output = 'url';
    }

    try {
      let response = await http.post<JsonPdfResponse>('/templates/merge', body, {
        headers: this.headers({
          Accept: 'application/json'
        })
      });

      return normalizePdfResponse(response.data, output, 'merge templates');
    } catch (error) {
      throw pdfApiIoApiError(error, 'merge templates');
    }
  }
}
