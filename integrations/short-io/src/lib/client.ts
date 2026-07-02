import { createAxios } from 'slates';

export interface ShortLink {
  id: number;
  idString: string;
  originalURL: string;
  shortURL: string;
  secureShortURL: string;
  path: string;
  title: string | null;
  tags: string[] | null;
  cloaking: boolean | null;
  redirectType: number | null;
  archived: boolean;
  skipQS: boolean;
  password: string | null;
  iphoneURL: string | null;
  androidURL: string | null;
  expiresAt: string | null;
  expiredURL: string | null;
  clicksLimit: number | null;
  splitURL: string | null;
  splitPercent: number | null;
  ttl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  createdAt: string;
  updatedAt: string;
  DomainId: number;
  OwnerId: number;
  folderId: string | null;
  icon: string | null;
  [key: string]: unknown;
}

export interface ShortDomain {
  id: number;
  hostname: string;
  title: string | null;
  segmentKey: string | null;
  unicodeHostname: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  TeamId: number | null;
  [key: string]: unknown;
}

export interface ListLinksResponse {
  count: number;
  links: ShortLink[];
  nextPageToken: string | null;
}

export interface LinkStatistics {
  totalClicks: number;
  humanClicks: number;
  humanClicksChange: number | null;
  totalClicksChange: number | null;
  clickStatistics: Record<string, unknown>;
  browser: Record<string, number>;
  country: Record<string, number>;
  city: Record<string, number>;
  referer: Record<string, number>;
  social: Record<string, number>;
  os: Record<string, number>;
  interval: {
    startDate: string;
    endDate: string;
  };
  [key: string]: unknown;
}

export interface DomainStatistics {
  totalClicks: number;
  humanClicks: number;
  humanClicksChange: number | null;
  totalClicksChange: number | null;
  clickStatistics: Record<string, unknown>;
  browser: Record<string, number>;
  country: Record<string, number>;
  city: Record<string, number>;
  referer: Record<string, number>;
  social: Record<string, number>;
  os: Record<string, number>;
  interval: {
    startDate: string;
    endDate: string;
  };
  [key: string]: unknown;
}

export interface CreateLinkParams {
  domain: string;
  originalURL: string;
  path?: string;
  title?: string;
  tags?: string[];
  allowDuplicates?: boolean;
  cloaking?: boolean;
  redirectType?: number;
  password?: string;
  iphoneURL?: string;
  androidURL?: string;
  expiresAt?: string;
  expiredURL?: string;
  clicksLimit?: number;
  splitURL?: string;
  splitPercent?: number;
  ttl?: string;
  skipQS?: boolean;
  archived?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  folderId?: string;
}

export interface UpdateLinkParams {
  originalURL?: string;
  path?: string;
  title?: string;
  tags?: string[];
  cloaking?: boolean;
  redirectType?: number;
  password?: string;
  iphoneURL?: string;
  androidURL?: string;
  expiresAt?: string;
  expiredURL?: string;
  clicksLimit?: number;
  splitURL?: string;
  splitPercent?: number;
  skipQS?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface ListLinksParams {
  domainId: number;
  limit?: number;
  pageToken?: string;
  dateSortOrder?: 'asc' | 'desc';
  beforeDate?: string;
  afterDate?: string;
  folderId?: string;
}

export interface StatisticsParams {
  period: string;
  tzOffset?: number;
  startDate?: string;
  endDate?: string;
}

export interface QrCodeParams {
  color?: string;
  backgroundColor?: string;
  size?: number;
  type?: 'png' | 'svg';
}

export class Client {
  private api: ReturnType<typeof createAxios>;
  private statsApi: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.short.io',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.statsApi = createAxios({
      baseURL: 'https://api-v2.short.io',
      headers: {
        Authorization: config.token,
        Accept: 'application/json'
      }
    });
  }

  async createLink(params: CreateLinkParams): Promise<ShortLink> {
    let response = await this.api.post('/links', params);
    return response.data;
  }

  async updateLink(linkId: string, params: UpdateLinkParams): Promise<ShortLink> {
    let response = await this.api.post(`/links/${linkId}`, params);
    return response.data;
  }

  async deleteLink(linkId: string): Promise<{ success: boolean }> {
    let response = await this.api.delete(`/links/${linkId}`);
    return response.data;
  }

  async getLink(linkId: string): Promise<ShortLink> {
    let response = await this.api.get(`/links/${linkId}`);
    return response.data;
  }

  async expandLink(domain: string, path: string): Promise<ShortLink> {
    let response = await this.api.get('/links/expand', {
      params: { domain, path }
    });
    return response.data;
  }

  async getLinkByOriginalUrl(domain: string, originalURL: string): Promise<ShortLink> {
    let response = await this.api.get('/links/by-original-url', {
      params: { domain, originalURL }
    });
    return response.data;
  }

  async listLinks(params: ListLinksParams): Promise<ListLinksResponse> {
    let { domainId, ...rest } = params;
    let response = await this.api.get('/api/links', {
      params: { domain_id: domainId, ...rest }
    });
    return response.data;
  }

  async listDomains(): Promise<ShortDomain[]> {
    let response = await this.api.get('/api/domains');
    return response.data;
  }

  async getDomain(domainId: number): Promise<ShortDomain> {
    let response = await this.api.get(`/domains/${domainId}`);
    return response.data;
  }

  async archiveLink(linkId: string): Promise<{ success: boolean }> {
    let response = await this.api.post('/links/archive', { link_id: linkId });
    return response.data;
  }

  async unarchiveLink(linkId: string): Promise<{ success: boolean }> {
    let response = await this.api.post('/links/unarchive', { link_id: linkId });
    return response.data;
  }

  async getLinkStatistics(linkId: string, params: StatisticsParams): Promise<LinkStatistics> {
    let queryParams: Record<string, unknown> = {
      period: params.period,
      tzOffset: params.tzOffset ?? 0
    };
    if (params.period === 'custom') {
      queryParams.startDate = params.startDate;
      queryParams.endDate = params.endDate;
    }
    let response = await this.statsApi.get(`/statistics/link/${linkId}`, {
      params: queryParams
    });
    return response.data;
  }

  async getDomainStatistics(
    domainId: number,
    params: StatisticsParams
  ): Promise<DomainStatistics> {
    let queryParams: Record<string, unknown> = {
      period: params.period,
      tzOffset: params.tzOffset ?? 0
    };
    if (params.period === 'custom') {
      queryParams.startDate = params.startDate;
      queryParams.endDate = params.endDate;
    }
    let response = await this.statsApi.get(`/statistics/domain/${domainId}`, {
      params: queryParams
    });
    return response.data;
  }

  async generateQrCode(linkIdString: string, params?: QrCodeParams): Promise<string> {
    let response = await this.api.post(
      `/links/qr/${linkIdString}`,
      {
        ...params,
        useDomainSettings: true
      },
      {
        responseType: 'arraybuffer'
      }
    );

    let contentType = String(response.headers?.['content-type'] ?? 'image/png');
    if (contentType.includes('svg')) {
      return Buffer.from(response.data).toString('utf-8');
    }

    let base64 = Buffer.from(response.data).toString('base64');
    return `data:${contentType};base64,${base64}`;
  }

  async getOpenGraph(domainId: number, linkId: string): Promise<Record<string, unknown>> {
    let response = await this.api.get(`/links/opengraph/${domainId}/${linkId}`);
    return response.data;
  }

  async setOpenGraph(
    domainId: number,
    linkId: string,
    ogData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.api.put(`/links/opengraph/${domainId}/${linkId}`, ogData);
    return response.data;
  }
}
