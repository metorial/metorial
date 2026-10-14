import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let normalizePrerenderError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Prerender',
    reason: 'prerender_api_error',
    extractResponse: (failure, helpers) => {
      let response = helpers.getResponse(failure);
      if (
        helpers.isRecord(failure) &&
        failure.name === 'SlateError' &&
        helpers.isRecord(failure.data) &&
        helpers.isRecord(failure.data.baggage) &&
        failure.data.baggage.response !== undefined
      ) {
        return { ...response, data: failure.data.baggage.response };
      }
      return response;
    }
  });

let recordResponse = (data: unknown): Record<string, unknown> => {
  if (isApiErrorRecord(data)) return data;
  if (typeof data === 'string') return { message: data };
  return { result: data ?? null };
};

let apiAxios = createAuthenticatedAxios({
  baseURL: 'https://api.prerender.io',
  timeout: 60_000,
  errorAdapter: normalizePrerenderError
});

let serviceAxios = createAuthenticatedAxios({
  baseURL: 'https://service.prerender.io',
  contentType: false,
  timeout: 120_000,
  errorAdapter: normalizePrerenderError
});

export interface RecacheParams {
  url?: string;
  urls?: string[];
  adaptiveType?: 'desktop' | 'mobile';
}

export interface RecacheResponse {
  message?: string;
  [key: string]: unknown;
}

export interface SearchParams {
  query?: string;
  exactMatch?: string;
  start?: number;
  adaptiveType?: 'desktop' | 'mobile';
}

export interface CachedUrl {
  url: string;
  adaptiveType?: string;
  lastCached?: string;
  [key: string]: unknown;
}

export interface SearchResponse {
  [key: string]: unknown;
}

export interface ClearCacheParams {
  query: string;
}

export interface ClearCacheResponse {
  message?: string;
  [key: string]: unknown;
}

export interface ClearCacheStatusResponse {
  status?: string;
  [key: string]: unknown;
}

export interface SitemapCreateParams {
  url: string;
  adaptiveType?: 'desktop' | 'mobile';
  revisitInterval?: string;
}

export interface SitemapResponse {
  [key: string]: unknown;
}

export interface RecacheSpeedParams {
  urlsPerHour: number;
}

export interface RecacheSpeedResponse {
  recacheMetrics?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface DomainListParams {
  query?: string;
}

export interface DomainConfigParams {
  domain: string;
}

export interface DomainConfigUpdateParams {
  domain: string;
  cacheLifetime?: number;
  [key: string]: unknown;
}

export interface RenderParams {
  url: string;
}

export class PrerenderClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token.trim();
    if (!this.token) {
      throw createApiServiceError('Provide your Prerender token to connect the account.', {
        reason: 'prerender_token_required'
      });
    }
  }

  private validateUrl(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createApiServiceError('Provide a full HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw createApiServiceError('Provide a full HTTP or HTTPS URL.');
    }
  }

  // ── Cache Management (Recache) ──

  async recache(params: RecacheParams): Promise<RecacheResponse> {
    let urls = params.urls?.length ? params.urls : params.url ? [params.url] : [];
    if (urls.length === 0 || urls.length > 1000) {
      throw createApiServiceError('Provide between 1 and 1,000 URLs per recache request.');
    }
    for (let url of urls) this.validateUrl(url);
    let body: Record<string, unknown> = {
      prerenderToken: this.token
    };

    if (params.urls && params.urls.length > 0) {
      body.urls = params.urls;
    } else if (params.url) {
      body.url = params.url;
    }

    if (params.adaptiveType) {
      body.adaptiveType = params.adaptiveType;
    }

    let response = await apiAxios.post('/recache', body);
    return recordResponse(response.data);
  }

  // ── Cache Search ──

  async searchCache(params: SearchParams): Promise<SearchResponse> {
    if (params.start !== undefined && (!Number.isInteger(params.start) || params.start < 0)) {
      throw createApiServiceError('start must be a non-negative integer offset.');
    }
    let body: Record<string, unknown> = {
      prerenderToken: this.token
    };

    if (params.exactMatch) {
      body.exactMatch = params.exactMatch;
    } else if (params.query) {
      body.query = params.query;
    }

    if (params.start !== undefined) {
      body.start = params.start;
    }

    if (params.adaptiveType) {
      body.adaptiveType = params.adaptiveType;
    }

    let response = await apiAxios.post('/search', body);
    return response.data;
  }

  // ── Cache Clearing ──

  async clearCache(params: ClearCacheParams): Promise<ClearCacheResponse> {
    if (!params.query.trim()) {
      throw createApiServiceError('Provide a non-empty URL pattern to clear.');
    }
    let body = {
      prerenderToken: this.token,
      query: params.query
    };

    let response = await apiAxios.post('/cache-clear', body);
    return recordResponse(response.data);
  }

  async getClearCacheStatus(): Promise<ClearCacheStatusResponse> {
    let response = await apiAxios.get(
      `/cache-clear-status/${encodeURIComponent(this.token)}`,
      {
        validateStatus: status => status === 200 || status === 403
      }
    );
    return {
      ...recordResponse(response.data),
      status: response.status === 403 ? 'in_progress' : 'not_queued',
      httpStatus: response.status
    };
  }

  // ── Sitemap Management (legacy API) ──

  async addSitemap(params: SitemapCreateParams): Promise<unknown> {
    this.validateUrl(params.url);
    let body: Record<string, unknown> = {
      prerenderToken: this.token,
      url: params.url
    };

    let response = await apiAxios.post('/sitemap', body);
    return response.data;
  }

  // ── Sitemap Management (v3 API) ──

  async listSitemaps(page?: number, pageSize?: number): Promise<unknown> {
    if (page !== undefined && (!Number.isInteger(page) || page < 0)) {
      throw createApiServiceError('page must be a non-negative integer.');
    }
    if (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1)) {
      throw createApiServiceError('pageSize must be a positive integer.');
    }
    let response = await apiAxios.get('/v3/sitemap', {
      params: {
        page: page ?? 0,
        pageSize: pageSize ?? 20
      },
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  async createSitemapV3(params: {
    url: string;
    adaptiveType?: string;
    revisitInterval?: string;
  }): Promise<unknown> {
    this.validateUrl(params.url);
    let response = await apiAxios.post(
      '/v3/sitemap',
      {
        url: params.url,
        adaptiveType: params.adaptiveType ?? 'desktop',
        revisitInterval: params.revisitInterval ?? 'weekly'
      },
      {
        headers: {
          'x-prerender-api-key': this.token
        }
      }
    );
    return response.data;
  }

  async deleteSitemap(sitemapId: string): Promise<unknown> {
    let response = await apiAxios.delete(`/v3/sitemap/${encodeURIComponent(sitemapId)}`, {
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  async updateSitemap(
    sitemapId: string,
    params: { revisitInterval?: string; adaptiveType?: string }
  ): Promise<unknown> {
    let response = await apiAxios.patch(
      `/v3/sitemap/${encodeURIComponent(sitemapId)}`,
      pickDefined(params),
      {
        headers: {
          'x-prerender-api-key': this.token
        }
      }
    );
    return response.data;
  }

  async triggerSitemapCrawl(sitemapId: string): Promise<unknown> {
    let response = await apiAxios.post(
      `/v3/sitemap/${encodeURIComponent(sitemapId)}/crawl`,
      {},
      {
        headers: {
          'x-prerender-api-key': this.token
        }
      }
    );
    return response.data;
  }

  // ── Recache Speed ──

  async changeRecacheSpeed(params: RecacheSpeedParams): Promise<RecacheSpeedResponse> {
    let speed = params.urlsPerHour;
    if (!Number.isFinite(speed) || (speed !== 0 && (speed < 3600 || speed > 36000))) {
      throw createApiServiceError('urlsPerHour must be 0, or between 3,600 and 36,000.');
    }
    let body = {
      prerenderToken: this.token,
      urlsPerHour: params.urlsPerHour
    };

    let response = await apiAxios.post('/change-recache-speed', body);
    return response.data;
  }

  // ── Domain Management (v3 API) ──

  async listDomains(query?: string): Promise<unknown> {
    let response = await apiAxios.get('/v3/domains', {
      params: query ? { query } : undefined,
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  async getDomainConfig(domain: string): Promise<unknown> {
    let response = await apiAxios.get(`/v3/domains/${encodeURIComponent(domain)}/config`, {
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  async updateDomainConfig(domain: string, config: Record<string, unknown>): Promise<unknown> {
    let response = await apiAxios.patch(
      `/v3/domains/${encodeURIComponent(domain)}/config`,
      config,
      {
        headers: {
          'x-prerender-api-key': this.token
        }
      }
    );
    return response.data;
  }

  async getDomainStatistics(): Promise<unknown> {
    let response = await apiAxios.get('/v3/domain-statistics', {
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  // ── URL Management (v3 API) ──

  async getUrlCount(query?: string): Promise<unknown> {
    let response = await apiAxios.get('/v3/urls/count', {
      params: query ? { query } : undefined,
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  // ── Page Rendering Service ──

  async renderPage(url: string): Promise<string> {
    this.validateUrl(url);
    let response = await serviceAxios.get(`/${url}`, {
      headers: {
        'X-Prerender-Token': this.token
      },
      responseType: 'text'
    });
    if (typeof response.data !== 'string') {
      throw createApiServiceError('Prerender returned an invalid rendered HTML response.');
    }
    return response.data;
  }
}
