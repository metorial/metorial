import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

let imageSchema = z.object({
  imageURL: z.url(),
  details: z
    .object({
      dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
      format: z.string().optional()
    })
    .optional(),
  usage: z
    .object({
      previousCredits: z.number().optional(),
      creditsUsed: z.number().optional(),
      remainingCredits: z.number().optional()
    })
    .optional()
});

let templatesSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
);

let elementsSchema = z.object({ elements: z.record(z.string(), z.unknown()) });

let accountSchema = z.object({
  name: z.string(),
  email: z.string(),
  usage: z.object({ remainingCredits: z.number() })
});

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('An Imagior API key is required. Reconnect your account.');
    }

    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.imagior.com',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Imagior',
          reason: 'imagior_api_error'
        })
    });
  }

  private parseResponse<T>(data: unknown, schema: z.ZodType<T>, operation: string): T {
    if (
      isApiErrorRecord(data) &&
      (data.status === 'error' ||
        data.status === 'failed' ||
        (typeof data.statusCode === 'number' && data.statusCode >= 400))
    ) {
      throw buildApiServiceError(
        { response: { status: data.statusCode, data } },
        {
          providerLabel: 'Imagior',
          reason: 'imagior_api_error',
          operation
        }
      );
    }

    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(
        `Imagior returned an unexpected response when attempting to ${operation}. Try again or contact Imagior support.`,
        { reason: 'imagior_invalid_response' }
      );
    }

    return result.data;
  }

  private validateTemplateId(templateId: string) {
    if (!templateId.trim()) {
      throw createApiServiceError(
        'A template ID is required. Call list_templates to find a design template.'
      );
    }
  }

  async generateImage(templateId: string, elements?: Record<string, unknown>) {
    this.validateTemplateId(templateId);
    let response = await this.http.post(
      '/image/generate',
      pickDefined({ templateId, elements })
    );
    return this.parseResponse(response.data, imageSchema, 'generate an image');
  }

  async listTemplates(options?: { sort?: string; order?: string }) {
    let response = await this.http.get('/templates/all', {
      params: pickDefined({ sort: options?.sort, order: options?.order })
    });
    return this.parseResponse(response.data, templatesSchema, 'list templates');
  }

  async getTemplateElements(templateId: string) {
    this.validateTemplateId(templateId);
    let response = await this.http.get(
      `/templates/${encodeURIComponent(templateId)}/elements`
    );
    return this.parseResponse(response.data, elementsSchema, 'retrieve template elements')
      .elements;
  }

  async getTemplateElementsBasic(templateId: string) {
    this.validateTemplateId(templateId);
    let response = await this.http.get(
      `/templates/${encodeURIComponent(templateId)}/elements/basic`
    );
    return this.parseResponse(
      response.data,
      elementsSchema,
      'retrieve basic template elements'
    ).elements;
  }

  async getAccount() {
    let response = await this.http.get('/user/account');
    return this.parseResponse(response.data, accountSchema, 'retrieve account details');
  }
}
