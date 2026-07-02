import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
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
    return response.data;
  }

  async deleteLink(shortenedLink: string): Promise<DeleteLinkResponse> {
    let response = await this.axios.delete(`/links/${encodeURIComponent(shortenedLink)}`);
    return response.data;
  }

  async listDomains(params?: ListDomainsParams): Promise<ListDomainsResponse> {
    let queryParams: Record<string, string | number> = {};
    if (params?.visibility) queryParams.visibility = params.visibility;
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.perPage = params.perPage;

    let response = await this.axios.get('/shorten-domains', { params: queryParams });
    return response.data;
  }

  async generateQrCode(params: QrCodeParams): Promise<string> {
    let queryParams: Record<string, string | number> = { url: params.url };
    if (params.width) queryParams.width = params.width;
    if (params.margin) queryParams.margin = params.margin;
    if (params.level) queryParams.level = params.level;
    if (params.dark) queryParams.dark = params.dark;
    if (params.light) queryParams.light = params.light;

    let response = await this.axios.get('/qrcode', {
      params: queryParams,
      headers: { Accept: 'application/xml' },
      responseType: 'text'
    });
    return response.data;
  }
}
