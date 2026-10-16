import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ShortLink {
  id: string | number;
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
  totalClicks?: number;
  humanClicks: number;
  humanClicksChange?: string | number | null;
  totalClicksChange?: string | number | null;
  clicks?: number;
  prevClicksChange?: string | number | null;
  browser?: unknown;
  country?: unknown;
  city?: unknown;
  referer?: unknown;
  social?: unknown;
  os?: unknown;
  interval?: { startDate?: string | null; endDate?: string | null };
  [key: string]: unknown;
}

export type DomainStatistics = LinkStatistics;

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
  passwordContact?: boolean;
}

export interface UpdateLinkParams {
  ttl?: string;
  archived?: boolean;
  passwordContact?: boolean;
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
  tz?: string;
  startDate?: string;
  endDate?: string;
}

export interface QrCodeParams {
  color?: string;
  backgroundColor?: string;
  size?: number;
  type?: 'png' | 'svg';
  useDomainSettings?: boolean;
}

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private statsApi: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Connect a Short.io secret API key before using this tool.');
    }
    let settings = {
      authHeader: { value: config.token },
      timeout: 30000,
      headers: { Accept: 'application/json' },
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, {
          providerLabel: 'Short.io',
          reason: 'short_io_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    };
    this.api = createAuthenticatedAxios({ ...settings, baseURL: 'https://api.short.io' });
    this.statsApi = createAuthenticatedAxios({
      ...settings,
      baseURL: 'https://statistics.short.io/statistics'
    });
  }

  async createLink(params: CreateLinkParams): Promise<ShortLink> {
    let response = await this.api.post('/links', params);
    return normalizeLink(response.data);
  }

  async updateLink(
    linkId: string,
    params: UpdateLinkParams,
    domainId?: number
  ): Promise<ShortLink> {
    let response = await this.api.post(`/links/${encodeURIComponent(linkId)}`, params, {
      params: { domain_id: domainId }
    });
    return normalizeLink(response.data);
  }

  async deleteLink(linkId: string): Promise<{ success: boolean }> {
    let response = await this.api.delete(`/links/${encodeURIComponent(linkId)}`);
    return checkSuccess(response.data);
  }

  async getLink(linkId: string, domainId?: number): Promise<ShortLink> {
    let response = await this.api.get(`/links/${encodeURIComponent(linkId)}`, {
      params: { domainId }
    });
    return normalizeLink(response.data);
  }

  async expandLink(domain: string, path: string): Promise<ShortLink> {
    let response = await this.api.get('/links/expand', { params: { domain, path } });
    return normalizeLink(response.data);
  }

  async getLinkByOriginalUrl(domain: string, originalURL: string): Promise<ShortLink> {
    // Retain the single-result endpoint for the existing lookup contract.
    let response = await this.api.get('/links/by-original-url', {
      params: { domain, originalURL }
    });
    return normalizeLink(response.data);
  }

  async findLinksByOriginalUrl(domain: string, originalURL: string): Promise<unknown> {
    let response = await this.api.get('/links/multiple-by-url', {
      params: { domain, originalURL }
    });
    return response.data;
  }

  async listLinks(params: ListLinksParams): Promise<ListLinksResponse> {
    let { domainId, ...rest } = params;
    let response = await this.api.get('/api/links', {
      params: { domain_id: domainId, ...rest }
    });
    return {
      ...response.data,
      links: response.data.links.map(normalizeLink),
      nextPageToken: response.data.nextPageToken ?? null
    };
  }

  async listDomains(
    params: {
      limit?: number;
      offset?: number;
      pattern?: string;
      teamId?: number;
      noTeamId?: boolean;
    } = {}
  ): Promise<ShortDomain[]> {
    let response = await this.api.get('/api/domains', { params });
    return response.data;
  }

  async getDomain(domainId: number): Promise<ShortDomain> {
    let response = await this.api.get(`/domains/${domainId}`);
    return response.data;
  }

  async archiveLink(linkId: string, domainId?: number): Promise<{ success: boolean }> {
    let response = await this.api.post('/links/archive', {
      link_id: linkId,
      domain_id: domainId === undefined ? undefined : String(domainId)
    });
    return checkSuccess(response.data);
  }

  async unarchiveLink(linkId: string, domainId?: number): Promise<{ success: boolean }> {
    let response = await this.api.post('/links/unarchive', {
      link_id: linkId,
      domain_id: domainId === undefined ? undefined : String(domainId)
    });
    return checkSuccess(response.data);
  }

  async getLinkStatistics(linkId: string, params: StatisticsParams): Promise<LinkStatistics> {
    let response = await this.statsApi.get(`/link/${encodeURIComponent(linkId)}`, {
      params: statisticsParams(params)
    });
    return response.data;
  }

  async getDomainStatistics(
    domainId: number,
    params: StatisticsParams
  ): Promise<DomainStatistics> {
    let response = await this.statsApi.get(`/domain/${domainId}`, {
      params: statisticsParams(params)
    });
    return response.data;
  }

  async generateQrCode(linkIdString: string, params: QrCodeParams = {}) {
    let customSettings =
      params.color !== undefined ||
      params.backgroundColor !== undefined ||
      params.size !== undefined;
    let response = await this.api.post(
      `/links/qr/${encodeURIComponent(linkIdString)}`,
      {
        ...params,
        useDomainSettings: params.useDomainSettings ?? !customSettings
      },
      { responseType: 'arraybuffer' }
    );
    let content = Buffer.from(response.data);
    let mimeType = String(
      response.headers?.['content-type'] ??
        (params.type === 'svg' ? 'image/svg+xml' : 'image/png')
    )
      .split(';')[0]!
      .trim();
    if (!['image/png', 'image/svg+xml'].includes(mimeType) || content.length === 0) {
      throw createApiServiceError('Short.io did not return a PNG or SVG QR code.');
    }
    return {
      content,
      mimeType,
      qrCode:
        mimeType === 'image/svg+xml'
          ? content.toString('utf-8')
          : `data:${mimeType};base64,${content.toString('base64')}`
    };
  }

  async listFolders(domainId: number): Promise<unknown> {
    let response = await this.api.get(`/links/folders/${domainId}`);
    return response.data;
  }

  async createFolder(params: {
    domainId: number;
    name: string;
    color?: string;
    backgroundColor?: string;
    prefix?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }): Promise<unknown> {
    let response = await this.api.post('/links/folders', params);
    return response.data;
  }

  async createLinksBulk(params: {
    domain: string;
    links: Omit<CreateLinkParams, 'domain' | 'folderId'>[];
    allowDuplicates?: boolean;
    folderId?: string;
  }): Promise<unknown> {
    let response = await this.api.post('/links/bulk', params);
    return response.data;
  }

  async getOpenGraph(domainId: number, linkId: string): Promise<unknown> {
    let response = await this.api.get(
      `/links/opengraph/${domainId}/${encodeURIComponent(linkId)}`
    );
    return response.data;
  }

  async setOpenGraph(
    domainId: number,
    linkId: string,
    properties: [string, string][]
  ): Promise<unknown> {
    let response = await this.api.put(
      `/links/opengraph/${domainId}/${encodeURIComponent(linkId)}`,
      properties
    );
    return response.data;
  }
}

let checkSuccess = (data: { success: boolean; error?: string }) => {
  if (!data.success) {
    throw createApiServiceError(
      data.error || 'Short.io did not confirm the operation succeeded.'
    );
  }
  return data;
};

let normalizeLink = (link: ShortLink): ShortLink => ({
  ...link,
  title: link.title ?? null,
  tags: link.tags ?? null,
  cloaking: link.cloaking ?? null,
  password: link.password ?? null,
  iphoneURL: link.iphoneURL ?? null,
  androidURL: link.androidURL ?? null,
  expiresAt: link.expiresAt == null ? null : String(link.expiresAt),
  expiredURL: link.expiredURL ?? null,
  clicksLimit: link.clicksLimit ?? null,
  redirectType: link.redirectType == null ? null : Number(link.redirectType),
  archived: link.archived ?? false,
  updatedAt: link.updatedAt ?? link.createdAt
});

let statisticsParams = (params: StatisticsParams) => {
  let query: Record<string, unknown> = { period: params.period };
  if (params.tz) query.tz = params.tz;
  else if (params.tzOffset !== undefined) query.tzOffset = params.tzOffset;
  else query.tz = 'UTC';
  if (params.period === 'custom') {
    if (!params.startDate || !params.endDate) {
      throw createApiServiceError('Provide startDate and endDate when period is custom.');
    }
    let parseDate = (value: string) => new Date(/^\d+$/.test(value) ? Number(value) : value);
    let start = parseDate(params.startDate);
    let end = parseDate(params.endDate);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
      throw createApiServiceError('Provide valid custom dates with startDate before endDate.');
    }
    query.startDate = start.toISOString();
    query.endDate = end.toISOString();
  }
  return query;
};

export let formatStatistics = (
  stats: LinkStatistics,
  period: string,
  source: 'link' | 'domain'
) => {
  if (!stats || typeof stats !== 'object') {
    throw createApiServiceError(
      'Short.io returned no statistics object. Request the statistics again.',
      { reason: 'short_io_invalid_statistics' }
    );
  }
  let totalClicks = source === 'domain' ? stats.clicks : stats.totalClicks;
  if (
    typeof totalClicks !== 'number' ||
    !Number.isFinite(totalClicks) ||
    totalClicks < 0 ||
    typeof stats.humanClicks !== 'number' ||
    !Number.isFinite(stats.humanClicks) ||
    stats.humanClicks < 0
  ) {
    throw createApiServiceError(
      `Short.io returned missing or invalid required ${source} click counts. Request the statistics again.`,
      { reason: 'short_io_invalid_statistics' }
    );
  }
  let unbounded =
    period === 'total' &&
    stats.interval?.startDate === null &&
    stats.interval?.endDate === null;
  let intervalBound = (value: unknown) => {
    // The official all-time example uses null bounds; empty strings preserve the legacy string contract without inventing dates.
    if (unbounded && value === null) return '';
    if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) {
      throw createApiServiceError(
        'Short.io returned a missing or invalid statistics interval. Request a bounded period or try again.',
        { reason: 'short_io_invalid_statistics' }
      );
    }
    return value;
  };
  let numberOrNull = (value: string | number | null | undefined) =>
    value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  let breakdown = (value: unknown, key: string): Record<string, number> => {
    if (!Array.isArray(value)) {
      return value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value).filter(([, count]) => typeof count === 'number')
          )
        : {};
    }
    return Object.fromEntries(
      value
        .filter(item => item && item[key] != null && typeof item.score === 'number')
        .map(item => [String(item[key]), item.score])
    );
  };
  return {
    totalClicks,
    humanClicks: stats.humanClicks,
    humanClicksChange: numberOrNull(stats.humanClicksChange),
    totalClicksChange: numberOrNull(stats.totalClicksChange ?? stats.prevClicksChange),
    browser: breakdown(stats.browser, 'browser'),
    country: breakdown(stats.country, 'country'),
    city: breakdown(stats.city, 'city'),
    referer: breakdown(stats.referer, 'referer'),
    social: breakdown(stats.social, 'social'),
    os: breakdown(stats.os, 'os'),
    intervalStart: intervalBound(stats.interval?.startDate),
    intervalEnd: intervalBound(stats.interval?.endDate),
    raw: stats
  };
};
