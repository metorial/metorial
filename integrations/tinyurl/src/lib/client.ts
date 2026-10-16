import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface CreateTinyUrlParams {
  url: string;
  domain?: string;
  alias?: string;
  tags?: string[];
  expiresAt?: string;
  description?: string;
}

export interface UpdateTinyUrlParams {
  domain: string;
  alias: string;
  newDomain?: string;
  newAlias?: string;
  newStats?: boolean;
  newTags?: string[];
  newExpiresAt?: string | null;
  newDescription?: string | null;
}

export interface ChangeUrlParams {
  domain: string;
  alias: string;
  url: string;
}

export interface ArchiveParams {
  domain: string;
  alias: string;
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
  alias?: string;
  tag?: string;
}

export interface TimelineAnalyticsParams extends AnalyticsParams {
  interval?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface ListUrlsParams {
  type: 'available' | 'archived';
  from?: string;
  to?: string;
  search?: string;
}

export interface AnalyticsStatusParams {
  domain: string;
  alias: string;
  enabled: boolean;
}

export interface AnalyticsSharingParams {
  domain: string;
  alias: string;
  public: boolean;
}

export interface TinyUrlAliasData {
  domain: string;
  alias: string;
  deleted: boolean;
  archived: boolean;
  tags: string[];
  analytics: {
    enabled: boolean;
    public: boolean;
  };
  tiny_url: string;
  created_at: string;
  expires_at: string | null;
  description?: string | null;
}

export interface TinyUrlData extends TinyUrlAliasData {
  url: string;
  hits: number;
}

interface ApiResponse<T> {
  code: number;
  errors: string[];
  data: T;
}

let toTinyUrlError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'TinyURL',
    reason: 'tinyurl_api_error',
    operation,
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_value, response, helpers) =>
      helpers.isRecord(response?.data) && typeof response.data.code === 'number'
        ? String(response.data.code)
        : undefined
  });

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.tinyurl.com',
      authHeader: { value: `Bearer ${params.token}` },
      headers: { Accept: 'application/json' }
    });
  }

  private async request<T>(
    operation: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<T> {
    let response = await requestAxiosData<ApiResponse<T>>(
      operation,
      () => this.axios.request({ method, url: path, data, params }),
      toTinyUrlError
    );

    if (response?.code !== 0 || response.errors?.length) {
      throw toTinyUrlError({ response: { data: response } }, operation);
    }
    if (response.data === undefined || response.data === null) {
      throw createApiServiceError(`TinyURL returned no data for ${operation}.`, {
        reason: 'tinyurl_invalid_response'
      });
    }
    return response.data;
  }

  createTinyUrl(params: CreateTinyUrlParams) {
    return this.request<TinyUrlAliasData & { url: string }>(
      'create TinyURL',
      'post',
      '/create',
      pickDefined({
        url: params.url,
        domain: params.domain,
        alias: params.alias,
        tags: params.tags,
        expires_at: params.expiresAt,
        description: params.description
      })
    );
  }

  getTinyUrl(domain: string, alias: string, operation = 'retrieve TinyURL') {
    return this.request<TinyUrlData>(
      operation,
      'get',
      `/alias/${encodeURIComponent(domain)}/${encodeURIComponent(alias)}`
    );
  }

  deleteTinyUrl(domain: string, alias: string) {
    return this.request<TinyUrlAliasData & { url: string }>(
      'delete TinyURL',
      'delete',
      `/alias/${encodeURIComponent(domain)}/${encodeURIComponent(alias)}`
    );
  }

  updateTinyUrl(params: UpdateTinyUrlParams) {
    return this.request<TinyUrlAliasData>(
      'update TinyURL metadata',
      'patch',
      '/update',
      pickDefined({
        domain: params.domain,
        alias: params.alias,
        new_domain: params.newDomain,
        new_alias: params.newAlias,
        new_stats: params.newStats,
        new_tags: params.newTags,
        new_expires_at: params.newExpiresAt,
        new_description: params.newDescription
      })
    );
  }

  changeUrl(params: ChangeUrlParams) {
    return this.request<{ url: string }>('change destination URL', 'patch', '/change', {
      domain: params.domain,
      alias: params.alias,
      url: params.url
    });
  }

  archiveTinyUrl(domain: string, alias: string) {
    return this.request<TinyUrlAliasData>('toggle archive status', 'patch', '/archive', {
      domain,
      alias
    });
  }

  async listTinyUrls(params: ListUrlsParams): Promise<TinyUrlData[]> {
    let aliases = await this.request<TinyUrlAliasData[]>(
      'list TinyURLs',
      'get',
      `/urls/${params.type}`,
      undefined,
      pickDefined({ from: params.from, to: params.to, search: params.search })
    );
    if (!Array.isArray(aliases)) {
      throw createApiServiceError('TinyURL returned an invalid link list.', {
        reason: 'tinyurl_invalid_response'
      });
    }

    let links: TinyUrlData[] = [];
    for (let alias of aliases) {
      // The list endpoint omits destination URLs and hit counts.
      let detail = await this.getTinyUrl(alias.domain, alias.alias);
      links.push({ ...alias, ...detail });
    }
    return links;
  }

  async countTinyUrls(params: ListUrlsParams): Promise<number> {
    let data = await this.request<{ count: number }>(
      'count TinyURLs',
      'get',
      `/urls/${params.type}/count`,
      undefined,
      pickDefined({ from: params.from, to: params.to, search: params.search })
    );
    if (!Number.isInteger(data.count) || data.count < 0) {
      throw createApiServiceError('TinyURL returned an invalid link count.', {
        reason: 'tinyurl_invalid_response'
      });
    }
    return data.count;
  }

  setAnalyticsStatus(params: AnalyticsStatusParams) {
    return this.request<TinyUrlAliasData>(
      'set analytics collection',
      'patch',
      '/analytics/status',
      {
        domain: params.domain,
        alias: params.alias,
        enabled: params.enabled
      }
    );
  }

  setAnalyticsSharing(params: AnalyticsSharingParams) {
    return this.request<TinyUrlAliasData>(
      'set analytics sharing',
      'patch',
      '/analytics/sharing',
      {
        domain: params.domain,
        alias: params.alias,
        public: params.public
      }
    );
  }

  getGeneralAnalytics(params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve general analytics',
      'get',
      '/analytics/general',
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  getTimelineAnalytics(params: TimelineAnalyticsParams) {
    return this.request<unknown>(
      'retrieve timeline analytics',
      'get',
      '/analytics/timeline',
      undefined,
      { ...this.buildAnalyticsQuery(params), ...pickDefined({ interval: params.interval }) }
    );
  }

  getTopSources(params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve traffic sources',
      'get',
      '/analytics/sources/top',
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  getTopLanguages(params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve languages',
      'get',
      '/analytics/languages/top',
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  getLocationAnalytics(region: string, params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve location analytics',
      'get',
      `/analytics/location/${encodeURIComponent(region || 'world')}`,
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  getWeekdayPopularity(params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve weekday popularity',
      'get',
      '/analytics/popularity/weekday',
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  getHourPopularity(params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve hourly popularity',
      'get',
      '/analytics/popularity/hour',
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  getRawAnalytics(params: AnalyticsParams) {
    return this.request<unknown>(
      'retrieve raw analytics logs',
      'get',
      '/analytics/raw/json',
      undefined,
      this.buildAnalyticsQuery(params)
    );
  }

  private buildAnalyticsQuery(params: AnalyticsParams) {
    if (!params.from?.trim()) {
      throw createApiServiceError(
        'Provide a start datetime in "from" for the analytics report.',
        {
          reason: 'tinyurl_analytics_start_required'
        }
      );
    }
    let alias = params.alias?.replace(/^https?:\/\//i, '');
    if (alias && !alias.includes('/')) alias = `tinyurl.com/${alias}`;
    return pickDefined({ from: params.from, to: params.to, alias, tag: params.tag });
  }
}
