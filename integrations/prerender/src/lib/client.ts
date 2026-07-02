import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.prerender.io'
});

let serviceAxios = createAxios({
  baseURL: 'https://service.prerender.io'
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
  recacheMetrics?: Record<string, unknown>;
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
    this.token = config.token;
  }

  // ── Cache Management (Recache) ──

  async recache(params: RecacheParams): Promise<RecacheResponse> {
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
    return response.data;
  }

  // ── Cache Search ──

  async searchCache(params: SearchParams): Promise<SearchResponse> {
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
    let body = {
      prerenderToken: this.token,
      query: params.query
    };

    let response = await apiAxios.post('/cache-clear', body);
    return response.data;
  }

  async getClearCacheStatus(): Promise<ClearCacheStatusResponse> {
    let response = await apiAxios.get(`/cache-clear-status/${this.token}`);
    return response.data;
  }

  // ── Sitemap Management (legacy API) ──

  async addSitemap(params: SitemapCreateParams): Promise<SitemapResponse> {
    let body: Record<string, unknown> = {
      prerenderToken: this.token,
      url: params.url
    };

    let response = await apiAxios.post('/sitemap', body);
    return response.data;
  }

  // ── Sitemap Management (v3 API) ──

  async listSitemaps(page?: number, pageSize?: number): Promise<unknown> {
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
    let response = await apiAxios.delete(`/v3/sitemap/${sitemapId}`, {
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
    let response = await apiAxios.patch(`/v3/sitemap/${sitemapId}`, params, {
      headers: {
        'x-prerender-api-key': this.token
      }
    });
    return response.data;
  }

  async triggerSitemapCrawl(sitemapId: string): Promise<unknown> {
    let response = await apiAxios.post(
      `/v3/sitemap/${sitemapId}/crawl`,
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
    let response = await serviceAxios.get(`/${url}`, {
      headers: {
        'X-Prerender-Token': this.token
      },
      responseType: 'text'
    });
    return response.data as string;
  }
}
