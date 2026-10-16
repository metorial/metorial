import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import { clicksSchema, getLinkSchema, listLinksSchema } from './schemas';

let BASE_URL = 'https://api.u301.com/v2';

export interface ShortenUrlParams {
  url: string;
  domain?: string;
  slug?: string;
  title?: string;
}

export interface ShortenUrlResponse {
  code: string;
  url: string;
  shortened: string;
  status: string;
}

export interface DeleteLinkResponse {
  success: boolean;
}

export interface ListDomainsParams {
  visibility?: 'public' | 'private' | 'all';
  page?: number;
  perPage?: number;
}

export interface Domain {
  domainName: string;
  visibility: string;
}

export interface PaginationMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  firstPage: number;
}

export interface ListDomainsResponse {
  meta: PaginationMeta;
  data: Domain[];
}

export interface QrCodeParams {
  url: string;
  width?: number;
  margin?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  dark?: string;
  light?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'U301',
          reason: 'u301_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        }),
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  async shortenUrl(params: ShortenUrlParams): Promise<ShortenUrlResponse> {
    let queryParams: Record<string, string> = { url: params.url };
    if (params.domain) queryParams.domain = params.domain;
    if (params.slug) queryParams.slug = params.slug;
    if (params.title) queryParams.title = params.title;

    let response = await this.axios.get('/shorten', { params: queryParams });
    return this.parse(
      z.object({
        code: z.string(),
        url: z.string(),
        shortened: z.string(),
        status: z.string()
      }),
      response.data
    );
  }

  async deleteLink(shortenedLink: string): Promise<DeleteLinkResponse> {
    let response = await this.axios.delete(`/links/${encodeURIComponent(shortenedLink)}`);
    return this.parse(z.object({ success: z.boolean() }), response.data);
  }

  async listDomains(params?: ListDomainsParams): Promise<ListDomainsResponse> {
    let queryParams: Record<string, string | number> = {};
    if (params?.visibility) queryParams.visibility = params.visibility;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.perPage !== undefined) queryParams.perPage = params.perPage;

    let response = await this.axios.get('/shorten-domains', { params: queryParams });
    this.parse(
      z.object({
        data: z.array(z.object({ domainName: z.string(), visibility: z.string() })),
        meta: z.object({ total: z.number(), currentPage: z.number(), lastPage: z.number() })
      }),
      response.data
    );
    return response.data;
  }

  async generateQrCode(params: QrCodeParams): Promise<string> {
    let queryParams: Record<string, string | number> = { url: params.url };
    if (params.width !== undefined) queryParams.width = params.width;
    if (params.margin !== undefined) queryParams.margin = params.margin;
    if (params.level) queryParams.level = params.level;
    if (params.dark) queryParams.dark = params.dark;
    if (params.light) queryParams.light = params.light;

    let response = await this.axios.get('/qrcode', {
      params: queryParams,
      headers: { Accept: 'application/xml' },
      responseType: 'text'
    });
    if (typeof response.data !== 'string' || !/<svg(?:\s|>)/i.test(response.data)) {
      throw createApiServiceError('U301 returned an invalid SVG QR code.');
    }
    return response.data;
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown): T {
    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(
        'U301 returned an invalid response. Required data is missing or malformed.'
      );
    }
    return result.data;
  }

  async listWorkspaces() {
    let response = await this.axios.get('/v3/workspaces', { baseURL: 'https://api.u301.com' });
    return this.parse(z.json(), response.data);
  }

  async getLink(shortenedLink: string, workspaceId?: string) {
    // The documented short-link path contains separate domain and slug segments.
    let path = shortenedLink.split('/').map(encodeURIComponent).join('/');
    let response = await this.axios.get(`/v3/shorten/${path}`, {
      baseURL: 'https://api.u301.com',
      params: { workspaceId }
    });
    return this.parse(getLinkSchema, response.data);
  }

  async listLinks(params: { workspaceId: string; page?: number; perPage?: number }) {
    for (let [name, value] of [
      ['page', params.page],
      ['perPage', params.perPage]
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        throw createApiServiceError(`${name} must be a positive whole number.`);
      }
    }
    let response = await this.axios.get('/v3/shorten/list', {
      baseURL: 'https://api.u301.com',
      params: { ...params, page: params.page ?? 1 }
    });
    return this.parse(listLinksSchema, response.data);
  }

  async getClickAnalytics(params: {
    workspaceId: string;
    range: '24h' | '1d' | '3d' | '7d' | '14d' | '30d' | '60d' | '1m';
    granularity: 'day' | 'hour';
    timezone?: string;
  }) {
    let response = await this.axios.get('/v3/shorten/analytics/clicks', {
      baseURL: 'https://api.u301.com',
      params
    });
    return this.parse(clicksSchema, response.data);
  }
}
