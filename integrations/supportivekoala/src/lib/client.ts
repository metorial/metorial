import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

let templateSchema = z.object({
  _id: z.string().min(1),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

let detailedTemplateSchema = templateSchema.extend({
  params: z.array(z.record(z.string(), z.unknown()))
});

let imageSchema = z.object({
  _id: z.string().min(1),
  template: z.string(),
  imageUrl: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string()
});

export class Client {
  private axios;
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token)) {
      throw createApiServiceError('A valid Supportivekoala API key is required.');
    }
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.supportivekoala.com/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 60_000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Supportivekoala',
          reason: 'supportivekoala_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
          formatMessage: ({ providerLabel, statusLabel, message }) =>
            `${providerLabel} API request failed: ${statusLabel}${this.redact(message, true)}`,
          // The transport error can contain the Authorization header.
          parent: {}
        })
    });
  }

  private containsAccountKey(value: string): boolean {
    let components = [value];
    try {
      let url = new URL(value);
      components.push(
        url.href,
        url.hostname,
        url.username,
        url.password,
        url.pathname,
        url.hash
      );
      for (let [key, item] of url.searchParams) components.push(key, item);
    } catch {
      // Non-URL provider strings still need percent-encoded secret detection.
    }
    for (let component of components) {
      for (let depth = 0; depth < 16; depth++) {
        if (component.includes(this.token)) return true;
        let decoded = component.replace(/(?:%[0-9a-f]{2})+/gi, encoded => {
          try {
            return decodeURIComponent(encoded);
          } catch {
            // Decode valid bytes even when an adjacent escape is malformed UTF-8.
            return new TextDecoder().decode(
              Uint8Array.from(encoded.match(/%[0-9a-f]{2}/gi) ?? [], byte =>
                Number.parseInt(byte.slice(1), 16)
              )
            );
          }
        });
        if (decoded === component) break;
        component = decoded;
        // Excessively nested encoding cannot be proven safe within this bound.
        if (depth === 15 && /%[0-9a-f]{2}/i.test(component)) return true;
      }
      if (component.includes(this.token)) return true;
    }
    return false;
  }

  private assertSafeImageUrl(data: unknown, generationSucceeded = false) {
    if (
      isApiErrorRecord(data) &&
      typeof data.imageUrl === 'string' &&
      this.containsAccountKey(data.imageUrl)
    ) {
      throw createApiServiceError(
        generationSucceeded
          ? 'Image generation succeeded, but its download URL could expose account credentials and was withheld. Retrieve the existing image by ID or contact Supportivekoala. Do not repeat potentially paid generation solely to retry the download.'
          : 'Supportivekoala returned an unsafe image URL that could expose account credentials. The URL was withheld. Retrieve the existing image by ID or contact Supportivekoala.',
        { reason: 'supportivekoala_unsafe_image_url' }
      );
    }
  }

  private redact(value: string, credentialQuery = false): string {
    let redacted = value.split(this.token).join('[REDACTED]');
    if (this.containsAccountKey(redacted)) redacted = '[REDACTED]';
    return credentialQuery
      ? redacted.replace(
          /([?&](?:api_?key|access_token|authorization|password|secret)=)[^&#\s]*/gi,
          '$1[REDACTED]'
        )
      : redacted;
  }

  private redactData(value: unknown): unknown {
    if (typeof value === 'string') return this.redact(value);
    if (Array.isArray(value)) return value.map(item => this.redactData(item));
    if (isApiErrorRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [this.redact(key), this.redactData(item)])
      );
    }
    return value;
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown, resource: string): T {
    let result = schema.safeParse(this.redactData(data));
    if (!result.success) {
      throw createApiServiceError(
        `Supportivekoala returned an invalid ${resource} response with missing or malformed required fields.`,
        { reason: 'supportivekoala_invalid_response' }
      );
    }
    return result.data;
  }

  private resourceId(id: string, field: string) {
    if (!id.trim() || id === '.' || id === '..') {
      throw createApiServiceError(`${field} must be a non-empty resource ID.`);
    }
    return encodeURIComponent(id);
  }

  async createTemplate(data: {
    name: string;
    width?: number;
    height?: number;
    params?: Record<string, unknown>[];
  }) {
    let response = await this.axios.post<unknown>('/templates', data);
    return this.parse(templateSchema, response.data, 'template');
  }

  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      width?: number;
      height?: number;
      params?: Record<string, unknown>[];
    }
  ) {
    let response = await this.axios.post<unknown>(
      `/templates/${this.resourceId(templateId, 'templateId')}`,
      data
    );
    return this.parse(templateSchema, response.data, 'template');
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.get<unknown>(
      `/templates/${this.resourceId(templateId, 'templateId')}`
    );
    return this.parse(detailedTemplateSchema, response.data, 'template');
  }

  async listTemplates() {
    let response = await this.axios.get<unknown>('/templates');
    return this.parse(z.array(templateSchema), response.data, 'template list');
  }

  async createImage(data: {
    template: string;
    params?: Record<string, unknown>;
    format?: 'png' | 'jpeg' | 'webp';
  }) {
    this.resourceId(data.template, 'templateId');
    let response = await this.axios.post<unknown>('/images', data);
    this.assertSafeImageUrl(response.data, true);
    return this.parse(imageSchema, response.data, 'image');
  }

  async getImage(imageId: string) {
    let response = await this.axios.get<unknown>(
      `/images/${this.resourceId(imageId, 'imageId')}`
    );
    this.assertSafeImageUrl(response.data);
    return this.parse(imageSchema, response.data, 'image');
  }

  async listImages() {
    let response = await this.axios.get<unknown>('/images');
    if (Array.isArray(response.data)) {
      for (let image of response.data) this.assertSafeImageUrl(image);
    }
    return this.parse(z.array(imageSchema), response.data, 'image list');
  }
}
