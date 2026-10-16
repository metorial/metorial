import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface CreateImageParams {
  html?: string;
  css?: string;
  url?: string;
  googleFonts?: string;
  msDelay?: number;
  deviceScale?: number;
  renderWhenReady?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  selector?: string;
  fullScreen?: boolean;
  colorScheme?: string;
  timezone?: string;
  blockConsentBanners?: boolean;
  templateId?: string;
  templateVersion?: number;
  templateValues?: Record<string, string>;
  format?: 'png' | 'jpg' | 'webp' | 'pdf';
}

export interface CreateTemplateParams extends Omit<CreateImageParams, 'html'> {
  html: string;
  name?: string;
  description?: string;
}

let optionalText = z.string().nullish();
let optionalNumber = z.number().finite().nullish();
let optionalInteger = z.number().refine(Number.isSafeInteger).nullish();
let imageSchema = z
  .object({
    id: z.string().min(1),
    url: z.string().min(1),
    created_at: z.string().min(1),
    html: optionalText,
    css: optionalText,
    google_fonts: optionalText,
    ms_delay: optionalInteger,
    device_scale: optionalNumber,
    selector: optionalText,
    viewport_width: optionalInteger,
    viewport_height: optionalInteger,
    template_id: optionalText,
    template_version: optionalInteger
  })
  .passthrough();
let templateSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().refine(Number.isSafeInteger),
    html: z.string(),
    name: optionalText,
    description: optionalText,
    css: optionalText,
    google_fonts: optionalText,
    ms_delay: optionalInteger,
    device_scale: optionalNumber,
    viewport_width: optionalInteger,
    viewport_height: optionalInteger,
    render_count: optionalInteger,
    created_at: optionalText
  })
  .passthrough();

let parseResponse = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError(
      `HTML/CSS to Image returned an invalid ${operation} response. For create requests, check list_images or list_templates before retrying because the operation may have succeeded.`
    );
  }
  return result.data;
};

export let validateInteger = (
  value: number | undefined,
  label: string,
  min: number,
  max?: number
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${label} must be an integer from ${min}${max === undefined ? ' upwards' : ` to ${max}`}.`
    );
  }
};

let validateRenderOptions = (params: CreateImageParams) => {
  if ((params.viewportWidth === undefined) !== (params.viewportHeight === undefined)) {
    throw createApiServiceError('Set viewportWidth and viewportHeight together.');
  }
  validateInteger(params.viewportWidth, 'viewportWidth', 1);
  validateInteger(params.viewportHeight, 'viewportHeight', 1);
  validateInteger(params.msDelay, 'msDelay', 0);
  validateInteger(params.templateVersion, 'templateVersion', 1);
};

let renderBody = (params: CreateImageParams) =>
  pickDefined({
    html: params.html,
    css: params.css,
    url: params.url,
    google_fonts: params.googleFonts,
    ms_delay: params.msDelay,
    device_scale: params.deviceScale,
    render_when_ready: params.renderWhenReady,
    viewport_width: params.viewportWidth,
    viewport_height: params.viewportHeight,
    selector: params.selector,
    full_screen: params.fullScreen,
    color_scheme: params.colorScheme,
    timezone: params.timezone,
    block_consent_banners: params.blockConsentBanners,
    format: params.format
  });

export let imageUrls = (imageId: string) => {
  if (!imageId.trim() || /[/?#\\]/.test(imageId)) {
    throw createApiServiceError('Use an image ID returned by generate_image or list_images.');
  }
  let url = `https://hcti.io/v1/image/${encodeURIComponent(imageId)}`;
  return {
    url,
    pngUrl: `${url}.png`,
    jpgUrl: `${url}.jpg`,
    webpUrl: `${url}.webp`,
    pdfUrl: `${url}.pdf`
  };
};

export class Client {
  private axios;
  private redactor;
  private encodedCredentials: string[];

  constructor(credentials: { userId: string; token: string }) {
    if (
      !credentials.userId.trim() ||
      credentials.userId.includes(':') ||
      !credentials.token.trim()
    ) {
      throw createApiServiceError(
        'Provide a valid API ID and API key from the HTML/CSS to Image dashboard.'
      );
    }
    this.redactor = new AuthConfigSecretRedactor({ token: credentials.token });
    this.encodedCredentials = [
      encodeURIComponent(credentials.token),
      Buffer.from(`${credentials.userId}:${credentials.token}`).toString('base64')
    ];
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://hcti.io/v1',
      auth: { username: credentials.userId, password: credentials.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HTML/CSS to Image',
          reason: 'html_to_image_api_error',
          parent: {},
          extractResponse: (input, helpers) => {
            let response = helpers.getResponseWithBody(input);
            return response ? { ...response, data: this.sanitize(response.data) } : undefined;
          },
          formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
            this.sanitizeText(
              `${providerLabel} API ${operation} failed: ${statusLabel}${message}`
            )
        })
    });
  }

  private sanitizeText(value: string) {
    let result = this.redactor
      .redactEmbedded(value)
      .replace(/\$\$MT\$secret\$authConfig\$[^\s$]+(?:\$\$)?/g, '[redacted]');
    for (let secret of this.encodedCredentials) {
      if (secret) result = result.split(secret).join('[redacted]');
    }
    return result
      .replace(
        /([?&](?:api[_-]?key|access[_-]?token|token|secret|password|authorization)=)[^&#\s"'<>]*/gi,
        '$1[redacted]'
      )
      .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@');
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') return this.sanitizeText(value);
    if (Array.isArray(value)) return value.map(item => this.sanitize(item));
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          /^(?:api[_-]?key|access[_-]?token|token|secret|password|authorization|cookie)$/i.test(
            key
          ) &&
          item !== null &&
          item !== undefined
            ? '[redacted]'
            : this.sanitize(item)
        ])
      );
    }
    return value;
  }

  async createImage(params: CreateImageParams) {
    validateRenderOptions(params);
    let endpoint = '/image';
    let body: Record<string, unknown>;
    if (params.templateId !== undefined) {
      if (!params.templateId.trim())
        throw createApiServiceError('Provide a template ID from list_templates.');
      if (params.templateValues === undefined) {
        throw createApiServiceError(
          'Provide templateValues with the variables required by the selected template. Use list_templates to inspect its placeholders before generating an image.'
        );
      }
      endpoint += `/${encodeURIComponent(params.templateId)}`;
      if (params.templateVersion !== undefined) endpoint += `/${params.templateVersion}`;
      // Preserve legacy request fields; the provider uses the saved template render settings.
      body = {
        ...renderBody(params),
        ...pickDefined({ template_values: params.templateValues })
      };
    } else {
      if (Boolean(params.html?.trim()) === Boolean(params.url?.trim())) {
        throw createApiServiceError(
          'Provide either nonempty html or a public url, but not both.'
        );
      }
      if (params.url !== undefined) {
        let parsed = z.url({ protocol: /^https?$/ }).safeParse(params.url);
        if (!parsed.success)
          throw createApiServiceError(
            'url must be a fully qualified HTTP or HTTPS webpage URL.'
          );
      }
      body = renderBody(params);
    }
    let response = await this.axios.post(endpoint, body);
    let data = parseResponse(
      z.object({ id: z.string().min(1), url: z.url({ protocol: /^https$/ }) }).passthrough(),
      this.sanitize(response.data),
      'image creation'
    );
    let urls = imageUrls(data.id);
    let returnedUrl = new URL(data.url);
    if (
      returnedUrl.origin !== 'https://hcti.io' ||
      returnedUrl.username ||
      returnedUrl.password ||
      returnedUrl.search ||
      returnedUrl.hash ||
      ![urls.url, urls.pngUrl, urls.jpgUrl, urls.webpUrl, urls.pdfUrl].includes(
        returnedUrl.href
      )
    ) {
      throw createApiServiceError(
        'The image was created, but its returned URL was unexpected. Check list_images before creating another image.'
      );
    }
    return { imageId: data.id, ...urls, url: returnedUrl.href, raw: data };
  }

  async listImages(page?: number, perPage?: number, pageToken?: string) {
    validateInteger(page, 'page', 1);
    validateInteger(perPage, 'perPage', 1, 50);
    if (pageToken !== undefined && !pageToken.trim())
      throw createApiServiceError('pageToken must not be empty.');
    if (pageToken !== undefined && page !== undefined && page !== 1)
      throw createApiServiceError('Use pageToken or a page number greater than 1, not both.');
    let token = pageToken;
    let seen = new Set<string>(token === undefined ? [] : [token]);
    let targetPage = page ?? 1;
    for (let currentPage = 1; currentPage <= targetPage; currentPage++) {
      let response = await this.axios.get('/images', {
        params: pickDefined({ count: perPage, page_token: token })
      });
      let data = parseResponse(
        z
          .object({
            images: z.array(imageSchema),
            next_page_token: z.string().nullish(),
            has_next_page: z.boolean().optional()
          })
          .passthrough(),
        this.sanitize(response.data),
        'image list'
      );
      if (data.has_next_page === true && !data.next_page_token) {
        throw createApiServiceError(
          'HTML/CSS to Image reported another image page without a pagination token.'
        );
      }
      if (data.next_page_token && seen.has(data.next_page_token)) {
        throw createApiServiceError(
          'HTML/CSS to Image returned a repeated image pagination token.'
        );
      }
      let images = data.images.map(item => ({
        imageId: item.id,
        url: item.url,
        createdAt: item.created_at,
        html: item.html ?? undefined,
        css: item.css ?? undefined,
        googleFonts: item.google_fonts ?? undefined,
        msDelay: item.ms_delay ?? undefined,
        deviceScale: item.device_scale ?? undefined,
        selector: item.selector ?? undefined,
        viewportWidth: item.viewport_width ?? undefined,
        viewportHeight: item.viewport_height ?? undefined,
        templateId: item.template_id ?? undefined,
        templateVersion: item.template_version ?? undefined,
        raw: item
      }));
      if (
        currentPage === targetPage ||
        !data.next_page_token ||
        data.has_next_page === false
      ) {
        return {
          images: currentPage === targetPage ? images : [],
          nextPageToken: data.next_page_token,
          hasNextPage: data.has_next_page,
          raw: data
        };
      }
      seen.add(data.next_page_token);
      token = data.next_page_token;
    }
    throw createApiServiceError('Unable to resolve the requested image page.');
  }

  async deleteImage(imageId: string): Promise<void> {
    imageUrls(imageId);
    await this.axios.delete(`/image/${encodeURIComponent(imageId)}`);
  }

  async deleteImagesBatch(imageIds: string[]): Promise<void> {
    for (let imageId of imageIds) imageUrls(imageId);
    await this.axios.delete('/image/batch', { data: { ids: imageIds } });
  }

  private async saveTemplate(params: CreateTemplateParams, templateId?: string) {
    validateRenderOptions(params);
    if (!params.html.trim())
      throw createApiServiceError('Provide nonempty html for the template.');
    if (templateId !== undefined && !templateId.trim())
      throw createApiServiceError('Provide a template ID from list_templates.');
    let body = {
      ...renderBody(params),
      ...pickDefined({ name: params.name, description: params.description })
    };
    let response = await this.axios.post(
      templateId === undefined ? '/template' : `/template/${encodeURIComponent(templateId)}`,
      body
    );
    let data = parseResponse(
      z
        .object({
          template_id: z.string().min(1),
          template_version: z.number().refine(Number.isSafeInteger)
        })
        .passthrough(),
      this.sanitize(response.data),
      'template save'
    );
    return { templateId: data.template_id, templateVersion: data.template_version, raw: data };
  }

  async createTemplate(params: CreateTemplateParams) {
    return this.saveTemplate(params);
  }
  async updateTemplate(templateId: string, params: CreateTemplateParams) {
    return this.saveTemplate(params, templateId);
  }

  async listTemplates(templateId?: string, count?: number, maxVersion?: number) {
    validateInteger(count, 'count', 1, 100);
    validateInteger(maxVersion, 'maxVersion', 1);
    if (templateId !== undefined && !templateId.trim())
      throw createApiServiceError('Provide a nonempty templateId or omit it.');
    let response = await this.axios.get(
      templateId === undefined ? '/template' : `/template/${encodeURIComponent(templateId)}`,
      {
        params: pickDefined({ count, max_version: maxVersion })
      }
    );
    let data = parseResponse(
      z
        .object({
          data: z.array(templateSchema),
          pagination: z.record(z.string(), z.unknown())
        })
        .passthrough(),
      this.sanitize(response.data),
      'template list'
    );
    return {
      templates: data.data.map(item => ({
        templateId: item.id,
        templateVersion: item.version,
        name: item.name ?? undefined,
        description: item.description ?? undefined,
        html: item.html,
        css: item.css ?? undefined,
        googleFonts: item.google_fonts ?? undefined,
        msDelay: item.ms_delay ?? undefined,
        deviceScale: item.device_scale ?? undefined,
        viewportWidth: item.viewport_width ?? undefined,
        viewportHeight: item.viewport_height ?? undefined,
        renderCount: item.render_count ?? undefined,
        createdAt: item.created_at ?? undefined,
        raw: item
      })),
      pagination: data.pagination,
      raw: data
    };
  }

  async getUsage() {
    let response = await this.axios.get('/usage');
    let counts = z.record(z.string(), z.number().finite());
    return parseResponse(
      z
        .object({
          data: z.object({ hour: counts, day: counts, month: counts }).passthrough(),
          per_billing_period: z.array(
            z
              .object({
                total_images: z.number().finite(),
                start: z.string(),
                end: z.string().nullable()
              })
              .passthrough()
          )
        })
        .passthrough(),
      this.sanitize(response.data),
      'usage'
    );
  }
}
