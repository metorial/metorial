import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

export interface ClientConfig {
  token: string;
  baseUrl: string;
  carboneVersion: number;
}

export interface UploadTemplateParams {
  template: string;
  versioning?: boolean;
  templateId?: string;
  name?: string;
  comment?: string;
  tags?: string[];
  category?: string;
  sample?: Record<string, unknown>[];
  deployedAt?: number;
  expireAt?: number;
}

export interface UploadTemplateResponse {
  templateId: string;
  versionId: string;
  type: string;
  size: number;
  createdAt: number;
}

let templateItemSchema = z.object({
  id: z.string(),
  versionId: z.string(),
  deployedAt: z
    .number()
    .nullish()
    .transform(value => value ?? 0),
  createdAt: z.number(),
  expireAt: z
    .number()
    .nullish()
    .transform(value => value ?? 0),
  size: z.number(),
  type: z.string(),
  name: z
    .string()
    .nullish()
    .transform(value => value ?? ''),
  category: z
    .string()
    .nullish()
    .transform(value => value ?? ''),
  comment: z
    .string()
    .nullish()
    .transform(value => value ?? ''),
  tags: z
    .array(z.string())
    .nullish()
    .transform(value => value ?? []),
  origin: z
    .number()
    .nullish()
    .transform(value => value ?? 0)
});

export type TemplateListItem = Omit<z.output<typeof templateItemSchema>, 'id'> & {
  templateId: string;
};

export interface ListTemplatesParams {
  templateId?: string;
  versionId?: string;
  category?: string;
  origin?: number;
  includeVersions?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface ListTemplatesResponse {
  templates: TemplateListItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface UpdateTemplateParams {
  name?: string;
  comment?: string;
  tags?: string[];
  category?: string;
  deployedAt?: number;
  expireAt?: number;
}

export interface RenderDocumentParams {
  templateIdOrVersionId: string;
  data: Record<string, unknown>;
  convertTo?: string | Record<string, unknown>;
  converter?: string;
  timezone?: string;
  lang?: string;
  complement?: Record<string, unknown>;
  variableStr?: string;
  reportName?: string;
  enum?: Record<string, unknown>;
  translations?: Record<string, unknown>;
  currencySource?: string;
  currencyTarget?: string;
  currencyRates?: Record<string, unknown>;
  hardRefresh?: boolean;
  batchSplitBy?: string;
  batchOutput?: string;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  template?: string;
}

export interface RenderDocumentResponse {
  renderId: string;
}

export interface CategoryItem {
  name: string;
}

export interface TagItem {
  name: string;
}

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Carbone',
    reason: 'carbone_api_error',
    operation
  });

let parseResponse = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError(`Carbone returned an invalid ${operation} response.`, {
      reason: 'carbone_invalid_response'
    });
  }
  return result.data;
};

let validateMetadata = (params: UpdateTemplateParams) => {
  for (let field of ['deployedAt', 'expireAt'] as const) {
    let value = params[field];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw createApiServiceError(
        `${field} must be a non-negative safe integer timestamp in seconds.`
      );
    }
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private baseUrl: string;

  constructor(private clientConfig: ClientConfig) {
    let parsedUrl = z.url().safeParse(clientConfig.baseUrl);
    if (!parsedUrl.success) {
      throw createApiServiceError('The Carbone base URL must be a valid HTTP or HTTPS URL.');
    }
    let url = new URL(parsedUrl.data);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw createApiServiceError(
        'The Carbone base URL must use HTTP or HTTPS without credentials, query parameters, or a fragment.'
      );
    }
    if (
      !Number.isSafeInteger(clientConfig.carboneVersion) ||
      clientConfig.carboneVersion < 1
    ) {
      throw createApiServiceError('The Carbone API version must be a positive whole number.');
    }
    this.baseUrl = url.toString().replace(/\/$/, '');
    this.axios = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Bearer ${clientConfig.token}` },
      headers: { 'carbone-version': String(clientConfig.carboneVersion) }
    });
  }

  private async request(
    operation: string,
    request: Parameters<typeof requestAxiosData>[1]
  ): Promise<Record<string, unknown>> {
    let body = await requestAxiosData(operation, request, apiError);
    let response = parseResponse(
      z
        .object({
          success: z.boolean(),
          error: z.string().optional()
        })
        .passthrough(),
      body,
      operation
    );
    if (!response.success) {
      throw createApiServiceError(
        `Carbone API ${operation} failed: ${response.error ?? 'The provider rejected the request.'}`,
        {
          reason: 'carbone_api_error'
        }
      );
    }
    return response;
  }

  getDownloadDetails(kind: 'template' | 'render', id: string) {
    if (!id.trim()) {
      throw createApiServiceError(
        `Provide a non-empty ${kind === 'template' ? 'template or version' : 'render'} ID.`
      );
    }
    return {
      url: `${this.baseUrl}/${kind}/${encodeURIComponent(id)}`,
      ...(kind === 'template'
        ? {
            headers: {
              Authorization: `Bearer ${this.clientConfig.token}`,
              'carbone-version': String(this.clientConfig.carboneVersion)
            }
          }
        : { query: { download: 'true' } })
    };
  }

  async uploadTemplate(params: UploadTemplateParams): Promise<UploadTemplateResponse> {
    validateMetadata(params);
    if (!params.template.trim()) {
      throw createApiServiceError('Provide a non-empty base64-encoded template.');
    }
    let body = pickDefined({
      versioning: params.versioning,
      id: params.templateId,
      name: params.name,
      comment: params.comment,
      tags: params.tags,
      category: params.category,
      sample: params.sample,
      deployedAt: params.deployedAt,
      expireAt: params.expireAt,
      template: params.template
    });
    let response = await this.request('upload template', () =>
      this.axios.post('/template', body)
    );
    let data = parseResponse(
      z.object({
        id: z.string().optional(),
        templateId: z.string().optional(),
        versionId: z.string().optional(),
        type: z.string().optional(),
        templateExtension: z.string().optional(),
        size: z.number().optional(),
        createdAt: z.number().optional()
      }),
      response.data,
      'upload template'
    );
    let templateId = data.id ?? data.templateId;
    let versionId = data.versionId ?? data.templateId;
    if (!templateId || !versionId) {
      throw createApiServiceError(
        'Carbone did not return the uploaded template identifiers.',
        {
          reason: 'carbone_invalid_response'
        }
      );
    }
    let type = data.type ?? data.templateExtension;
    if (type !== undefined && data.size !== undefined && data.createdAt !== undefined) {
      return { templateId, versionId, type, size: data.size, createdAt: data.createdAt };
    }
    // Unversioned uploads may return only the legacy hash and extension.
    try {
      let metadata = (await this.listTemplates({ versionId })).templates.find(
        item => item.versionId === versionId
      );
      if (!metadata) {
        throw createApiServiceError('Carbone returned no metadata for the uploaded version.', {
          reason: 'carbone_invalid_response'
        });
      }
      return {
        templateId,
        versionId,
        type: type ?? metadata.type,
        size: metadata.size,
        createdAt: metadata.createdAt
      };
    } catch (error) {
      let recoveryError = apiError(error, 'retrieve uploaded template metadata');
      let message = `Template upload succeeded. Template ID: ${templateId}; Version ID: ${versionId}. Metadata recovery failed: ${recoveryError.data.message} Do not repeat the upload; use these IDs to render, download, or delete the existing template.`;
      let uploadError = createApiServiceError(message, { parent: recoveryError });
      Object.assign(uploadError.data, recoveryError.data, {
        message,
        uploadSucceeded: true,
        templateId,
        versionId
      });
      throw uploadError;
    }
  }

  async deleteTemplate(templateIdOrVersionId: string): Promise<void> {
    let url = this.getDownloadDetails('template', templateIdOrVersionId).url;
    await this.request('delete template', () => this.axios.delete(url));
  }

  async updateTemplate(
    templateIdOrVersionId: string,
    params: UpdateTemplateParams
  ): Promise<void> {
    validateMetadata(params);
    let body = pickDefined(params);
    if (Object.keys(body).length === 0) {
      throw createApiServiceError('Provide at least one template metadata field to update.');
    }
    let url = this.getDownloadDetails('template', templateIdOrVersionId).url;
    await this.request('update template', () => this.axios.patch(url, body));
  }

  async listTemplates(params: ListTemplatesParams = {}): Promise<ListTemplatesResponse> {
    if (
      params.limit !== undefined &&
      (!Number.isSafeInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 100.');
    }
    if (
      params.origin !== undefined &&
      (!Number.isSafeInteger(params.origin) || params.origin < 0 || params.origin > 4)
    ) {
      throw createApiServiceError('origin must be a whole number from 0 to 4.');
    }
    let response = await this.request('list templates', () =>
      this.axios.get('/templates', {
        params: pickDefined({ ...params, templateId: undefined, id: params.templateId })
      })
    );
    let data = parseResponse(
      z.object({
        data: z.array(templateItemSchema),
        hasMore: z.boolean(),
        nextCursor: z.string().nullish()
      }),
      response,
      'list templates'
    );
    return {
      templates: data.data.map(({ id, ...item }) => ({ templateId: id, ...item })),
      hasMore: data.hasMore,
      nextCursor: data.nextCursor ?? null
    };
  }

  async listCategories(): Promise<CategoryItem[]> {
    let response = await this.request('list categories', () =>
      this.axios.get('/templates/categories')
    );
    return parseResponse(
      z.array(z.object({ name: z.string() })),
      response.data,
      'list categories'
    );
  }

  async listTags(): Promise<TagItem[]> {
    let response = await this.request('list tags', () => this.axios.get('/templates/tags'));
    return parseResponse(z.array(z.object({ name: z.string() })), response.data, 'list tags');
  }

  async renderDocument(params: RenderDocumentParams): Promise<RenderDocumentResponse> {
    if (params.batchSplitBy && !params.webhookUrl) {
      throw createApiServiceError(
        'Batch rendering requires webhookUrl for asynchronous processing.'
      );
    }
    if (params.webhookHeaders && !params.webhookUrl) {
      throw createApiServiceError('Provide webhookUrl when setting webhookHeaders.');
    }
    if (params.batchOutput && !params.batchSplitBy) {
      throw createApiServiceError('Provide batchSplitBy when selecting batchOutput.');
    }
    if (params.hardRefresh && params.convertTo === undefined) {
      throw createApiServiceError('Provide convertTo when enabling hardRefresh.');
    }
    let outputFormat =
      typeof params.convertTo === 'string' ? params.convertTo : params.convertTo?.formatName;
    if (params.batchOutput === 'pdf' && outputFormat !== 'pdf') {
      throw createApiServiceError('Merged PDF batches require convertTo to be pdf.');
    }
    let { templateIdOrVersionId, webhookUrl, webhookHeaders, ...body } = params;
    let headers: Record<string, string> = {};
    if (webhookUrl) headers['carbone-webhook-url'] = webhookUrl;
    for (let [key, value] of Object.entries(webhookHeaders ?? {})) {
      if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(key) || /[\r\n]/.test(value)) {
        throw createApiServiceError(
          'Webhook headers must use valid HTTP header names and values without line breaks.'
        );
      }
      headers[`carbone-webhook-header-${key}`] = value;
    }
    let id = params.template !== undefined ? 'template' : templateIdOrVersionId;
    if (!id.trim() || (params.template !== undefined && !params.template.trim())) {
      throw createApiServiceError(
        'Provide a stored template ID or a non-empty inlineTemplate.'
      );
    }
    let response = await this.request('render document', () =>
      this.axios.post(`/render/${encodeURIComponent(id)}`, pickDefined(body), { headers })
    );
    return parseResponse(z.object({ renderId: z.string() }), response.data, 'render document');
  }

  async getStatus(): Promise<{ success: boolean; message: string }> {
    let statusAxios = createAxios({ baseURL: this.baseUrl });
    let data = await requestAxiosData(
      'check status',
      () => statusAxios.get('/status'),
      apiError
    );
    return parseResponse(
      z.object({ success: z.boolean(), message: z.string().optional() }).transform(value => ({
        success: value.success,
        message: value.message ?? (value.success ? 'OK' : 'Unavailable')
      })),
      data,
      'check status'
    );
  }
}
