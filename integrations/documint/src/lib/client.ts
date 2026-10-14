import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';

let BASE_URL = 'https://api.documint.me/1';

export interface DocumentMergeOptions {
  templateId: string;
  variables: Record<string, unknown>;
  preview?: boolean;
}

export interface TemplateListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  name?: string;
}

let responseRecord = (data: unknown): Record<string, unknown> => {
  if (isApiErrorRecord(data)) {
    let result = data.result === undefined ? data : data.result;
    if (isApiErrorRecord(result)) return result;
  }
  throw createApiServiceError('Documint returned an unexpected response object.');
};

export let mapTemplate = (template: Record<string, unknown>, fallbackId?: string) => {
  let templateId = template.id ?? template._id ?? fallbackId;
  if (typeof templateId !== 'string' || !templateId) {
    throw createApiServiceError('Documint returned a template without an identifier.');
  }
  return {
    templateId,
    templateName: typeof template.name === 'string' ? template.name : '',
    rawTemplate: template
  };
};

export class DocumintClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Documint API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 120000,
      authHeader: { name: 'api_key', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Documint',
          reason: 'documint_api_error'
        })
    });
  }

  async listTemplates(options: TemplateListOptions): Promise<Record<string, unknown>[]> {
    if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 1)) {
      throw createApiServiceError('page must be a whole number greater than or equal to 1.');
    }
    if (
      options.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 200)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 200.');
    }
    let response = await this.axios.get('/templates', {
      params: pickDefined(options)
    });
    let templates = isApiErrorRecord(response.data) ? response.data.result : response.data;
    if (!Array.isArray(templates) || !templates.every(isApiErrorRecord)) {
      throw createApiServiceError('Documint returned an unexpected template list.');
    }
    return templates;
  }

  async getTemplate(templateId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/templates/${encodeURIComponent(templateId)}`);
    return responseRecord(response.data);
  }

  async updateTemplate(templateId: string, name: string): Promise<Record<string, unknown>> {
    await this.axios.put(`/templates/${encodeURIComponent(templateId)}`, { name });
    return this.getTemplate(templateId);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/templates/${encodeURIComponent(templateId)}`);
  }

  async createDocument(options: DocumentMergeOptions): Promise<Record<string, unknown>> {
    let { templateId, variables, preview } = options;
    let response = await this.axios.post(
      `/templates/${encodeURIComponent(templateId)}/content`,
      variables,
      {
        params: {
          active: true,
          ...(preview != null ? { preview } : {})
        }
      }
    );
    return responseRecord(response.data);
  }

  async downloadDocument(url: string): Promise<Response> {
    let parsed = URL.canParse(url) ? new URL(url) : undefined;
    if (!parsed || parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw createApiServiceError('Documint did not return a valid HTTPS PDF download URL.');
    }
    // The generated URL is public; never forward the API key to its storage host.
    let downloadClient = createAxios({ timeout: 120000 });
    let response = await requestAxios(
      'download generated PDF',
      () => downloadClient.get<ArrayBuffer>(url, { responseType: 'arraybuffer' }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Documint',
          reason: 'documint_download_error',
          operation
        })
    );
    let bytes = Buffer.from(response.data);
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw createApiServiceError('Documint returned a download that is not a PDF document.');
    }
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': 'application/pdf' }
    });
  }
}
