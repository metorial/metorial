import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

let templatePropertySchema = z
  .object({
    key: z.string(),
    type: z.string(),
    defaultValue: z.string(),
    componentId: z.string(),
    componentType: z.string(),
    property: z.string()
  })
  .passthrough();
let templateSchema = z
  .object({
    identifier: z.string(),
    name: z.string(),
    preview: z.string().optional(),
    scaleFactor: z.number().optional(),
    outputFormat: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    createdBy: z.string().optional(),
    editor: z.string().optional(),
    tags: z.array(z.string()).optional(),
    quality: z.number().optional(),
    properties: z.array(templatePropertySchema).optional()
  })
  .passthrough();
let renderSchema = z
  .object({
    requestId: z.string(),
    href: z.string(),
    status: z.string().optional(),
    cached: z.boolean().optional()
  })
  .passthrough();
let resultSchema = z
  .object({
    identifier: z.string(),
    href: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    templateName: z.string().optional(),
    createdAt: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    thumbnailHref: z.string().nullable().optional(),
    durationMs: z.number().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
    templateIdentifier: z.string().optional(),
    fileName: z.string().optional()
  })
  .passthrough();
let resultDetailsSchema = resultSchema.partial({ href: true }).extend({
  template: z.string().optional(),
  requestPayload: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});
let pageSchema = z
  .object({
    content: z.array(resultSchema),
    totalPages: z.number(),
    totalElements: z.number(),
    number: z.number(),
    size: z.number(),
    first: z.boolean(),
    last: z.boolean()
  })
  .passthrough();
let contentSchema = z
  .object({
    html: z.string(),
    css: z.string().optional(),
    sampleData: z.unknown().optional()
  })
  .passthrough();
let usageSchema = z
  .object({
    identifier: z.string(),
    credits: z
      .object({
        used: z.number().optional(),
        total: z.number().optional(),
        nextRenewalAt: z.string().nullable().optional(),
        renewalAmount: z.number().optional()
      })
      .passthrough()
      .optional(),
    uploads: z
      .object({ used: z.number().optional(), total: z.number().optional() })
      .passthrough()
      .optional(),
    plan: z
      .object({
        name: z.string().optional(),
        status: z.string().optional(),
        nextBillingAt: z.string().nullable().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export interface RenderRequest {
  template: string;
  data?: Record<string, string>;
  fileName?: string;
  webhookUrl?: string;
  version?: string;
  metadata?: Record<string, unknown>;
  batchName?: string;
  width?: number;
  height?: number;
  waitTime?: number;
  cache?: boolean;
  outputFormat?: string;
  duration?: number;
  fps?: number;
}
export interface ScreenshotRequest {
  url: string;
  width: number;
  height: number;
  waitTime?: number;
  webhookUrl?: string;
}
export type RenderResponse = z.infer<typeof renderSchema>;
export type TemplateDetails = z.infer<typeof templateSchema>;
export type TemplateEntry = TemplateDetails;
export type RenderResultItem = z.infer<typeof resultSchema>;

export let validateInteger = (
  name: string,
  value: number | undefined,
  min: number,
  max?: number
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${name} must be an integer from ${min}${max === undefined ? ' or greater' : ` to ${max}`}.`
    );
  }
};
export let validateUrl = (name: string, value: string | undefined) => {
  if (value === undefined) return;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw createApiServiceError(`${name} must be a full HTTP or HTTPS URL.`);
  }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw createApiServiceError(
      `${name} must be an HTTP or HTTPS URL without embedded credentials.`
    );
  }
};
let validateId = (value: string) => {
  if (!value.trim()) throw createApiServiceError('A non-empty identifier is required.');
  return encodeURIComponent(value);
};
let validatePagination = (params?: { page?: number; size?: number }) => {
  validateInteger('page', params?.page, 0);
  validateInteger('size', params?.size, 1, 50);
};

export class Client {
  private axios;
  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('A RenderForm API key is required.');
    this.axios = createAxios({
      baseURL: 'https://get.renderform.io',
      timeout: 30000,
      maxRedirects: 0,
      paramsSerializer: { indexes: null },
      headers: { 'X-API-KEY': token, 'Content-Type': 'application/json' }
    });
  }
  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    url: string,
    schema: z.ZodType<T>,
    options: { data?: unknown; params?: Record<string, unknown>; baseURL?: string } = {}
  ): Promise<T> {
    try {
      let response = await this.axios.request({ method, url, ...options });
      let parsed = schema.safeParse(response.data);
      if (!parsed.success)
        throw createApiServiceError(
          'RenderForm returned a malformed response for this operation.',
          { reason: 'invalid_response' }
        );
      return parsed.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'RenderForm',
        reason: 'renderform_api_error',
        operation: `${method.toUpperCase()} ${url}`,
        detailKeys: ['msg', 'message', 'detail', 'error'],
        nestedKeys: ['errors'],
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
      });
    }
  }
  async renderImage(request: RenderRequest) {
    validateId(request.template);
    validateInteger('width', request.width, 1);
    validateInteger('height', request.height, 1);
    validateInteger('waitTime', request.waitTime, 0, 5000);
    validateInteger('duration', request.duration, 1000, 30000);
    if (request.fps !== undefined && ![24, 25, 30].includes(request.fps))
      throw createApiServiceError('fps must be 24, 25, or 30.');
    validateUrl('webhookUrl', request.webhookUrl);
    return this.request('post', '/api/v2/render', renderSchema, { data: request });
  }
  async takeScreenshot(request: ScreenshotRequest) {
    validateUrl('url', request.url);
    validateUrl('webhookUrl', request.webhookUrl);
    validateInteger('width', request.width, 32, 5000);
    validateInteger('height', request.height, 32, 5000);
    validateInteger('waitTime', request.waitTime, 0, 5000);
    return this.request('post', '/api/v1/screenshots', renderSchema, {
      data: request,
      baseURL: 'https://api.renderform.io'
    });
  }
  async capturePdf(request: { url: string; format?: string; waitTime?: number }) {
    validateUrl('url', request.url);
    validateInteger('waitTime', request.waitTime, 0, 5000);
    return this.request('post', '/api/v1/pdf', renderSchema, {
      data: request,
      baseURL: 'https://api.renderform.io'
    });
  }
  async listTemplates(params?: {
    name?: string;
    tags?: string[];
    page?: number;
    size?: number;
    sourceTemplateId?: string;
  }) {
    validatePagination(params);
    return this.request('get', '/api/v2/my-templates', z.array(templateSchema), {
      params: { ...params }
    });
  }
  async getTemplate(templateId: string) {
    return this.request(
      'get',
      `/api/v2/my-templates/${validateId(templateId)}`,
      templateSchema
    );
  }
  async createTemplate(data: {
    name: string;
    width: number;
    height: number;
    editor: string;
    tags?: string[];
    outputFormat?: string;
  }) {
    if (!data.name.trim()) throw createApiServiceError('Template name must not be empty.');
    validateInteger('width', data.width, 1);
    validateInteger('height', data.height, 1);
    if (['mp4', 'webm'].includes(data.outputFormat ?? '') && data.editor !== 'canvas-html')
      throw createApiServiceError('Video formats require the canvas-html editor.');
    return this.request('post', '/api/v2/my-templates', templateSchema, { data });
  }
  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      width?: number;
      height?: number;
      outputFormat?: string;
      tags?: string[];
    }
  ) {
    if (!Object.values(data).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one template field to update.');
    validateInteger('width', data.width, 1);
    validateInteger('height', data.height, 1);
    return this.request(
      'patch',
      `/api/v2/my-templates/${validateId(templateId)}`,
      templateSchema,
      { data }
    );
  }
  async deleteTemplate(templateId: string) {
    await this.request(
      'delete',
      `/api/v2/my-templates/${validateId(templateId)}`,
      z.unknown()
    );
  }
  async getTemplateContent(templateId: string) {
    return this.request(
      'get',
      `/api/v2/my-templates/${validateId(templateId)}/html-editor`,
      contentSchema
    );
  }
  async updateTemplateContent(
    templateId: string,
    data: { html: string; css?: string; sampleData?: Record<string, unknown> }
  ) {
    if (!data.html.trim()) throw createApiServiceError('Template HTML must not be empty.');
    return this.request(
      'put',
      `/api/v2/my-templates/${validateId(templateId)}/html-editor`,
      contentSchema,
      { data }
    );
  }
  async listResults(params?: {
    page?: number;
    size?: number;
    template?: string;
    batch?: string;
  }) {
    validatePagination(params);
    return this.request('get', '/api/v2/results', pageSchema, { params: { ...params } });
  }
  async getResult(identifier: string) {
    return this.request(
      'get',
      `/api/v2/results/${validateId(identifier)}`,
      resultDetailsSchema
    );
  }
  async deleteResult(identifier: string) {
    await this.request('delete', `/api/v2/results/${validateId(identifier)}`, z.unknown());
  }
  async getUsage() {
    return this.request('get', '/api/v1/usage', usageSchema);
  }
}
