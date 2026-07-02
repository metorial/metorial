import { createAxios } from 'slates';

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

export interface TinyUrlData {
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
  url: string;
  created_at: string;
  expires_at: string | null;
  description: string | null;
  hits: number;
}

export interface ApiResponse<T> {
  code: number;
  errors: string[];
  data: T;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.tinyurl.com',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createTinyUrl(params: CreateTinyUrlParams): Promise<TinyUrlData> {
    let body: Record<string, unknown> = { url: params.url };
    if (params.domain) body.domain = params.domain;
    if (params.alias) body.alias = params.alias;
    if (params.tags && params.tags.length > 0) body.tags = params.tags;
    if (params.expiresAt) body.expires_at = params.expiresAt;
    if (params.description) body.description = params.description;

    let response = await this.axios.post<ApiResponse<TinyUrlData>>('/create', body);
    return response.data.data;
  }

  async getTinyUrl(domain: string, alias: string): Promise<TinyUrlData> {
    let response = await this.axios.get<ApiResponse<TinyUrlData>>(
      `/alias/${encodeURIComponent(domain)}/${encodeURIComponent(alias)}`
    );
    return response.data.data;
  }

  async deleteTinyUrl(domain: string, alias: string): Promise<TinyUrlData> {
    let response = await this.axios.delete<ApiResponse<TinyUrlData>>(
      `/alias/${encodeURIComponent(domain)}/${encodeURIComponent(alias)}`
    );
    return response.data.data;
  }

  async updateTinyUrl(params: UpdateTinyUrlParams): Promise<TinyUrlData> {
    let body: Record<string, unknown> = {
      domain: params.domain,
      alias: params.alias
    };
    if (params.newDomain !== undefined) body.new_domain = params.newDomain;
    if (params.newAlias !== undefined) body.new_alias = params.newAlias;
    if (params.newStats !== undefined) body.new_stats = params.newStats;
    if (params.newTags !== undefined) body.new_tags = params.newTags;
    if (params.newExpiresAt !== undefined) body.new_expires_at = params.newExpiresAt;
    if (params.newDescription !== undefined) body.new_description = params.newDescription;

    let response = await this.axios.patch<ApiResponse<TinyUrlData>>('/update', body);
    return response.data.data;
  }

  async changeUrl(params: ChangeUrlParams): Promise<TinyUrlData> {
    let response = await this.axios.patch<ApiResponse<TinyUrlData>>('/change', {
      domain: params.domain,
      alias: params.alias,
      url: params.url
    });
    return response.data.data;
  }

  async archiveTinyUrl(domain: string, alias: string): Promise<TinyUrlData> {
    let response = await this.axios.patch<ApiResponse<TinyUrlData>>('/archive', {
      domain,
      alias
    });
    return response.data.data;
  }

  async listTinyUrls(params: ListUrlsParams): Promise<TinyUrlData[]> {
    let queryParams: Record<string, string> = {};
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (params.search) queryParams.search = params.search;

    let response = await this.axios.get<ApiResponse<TinyUrlData[]>>(`/urls/${params.type}`, {
      params: queryParams
    });
    return response.data.data;
  }

  async countTinyUrls(params: ListUrlsParams): Promise<number> {
    let queryParams: Record<string, string> = {};
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (params.search) queryParams.search = params.search;

    let response = await this.axios.get<ApiResponse<{ count: number }>>(
      `/urls/${params.type}/count`,
      {
        params: queryParams
      }
    );
    return response.data.data.count;
  }

  async setAnalyticsStatus(params: AnalyticsStatusParams): Promise<TinyUrlData> {
    let response = await this.axios.patch<ApiResponse<TinyUrlData>>('/analytics/status', {
      domain: params.domain,
      alias: params.alias,
      enabled: params.enabled
    });
    return response.data.data;
  }

  async getGeneralAnalytics(params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>('/analytics/general', {
      params: this.buildAnalyticsQuery(params)
    });
    return response.data.data;
  }

  async getTimelineAnalytics(params: TimelineAnalyticsParams): Promise<unknown> {
    let queryParams = this.buildAnalyticsQuery(params);
    if (params.interval) queryParams.interval = params.interval;

    let response = await this.axios.get<ApiResponse<unknown>>('/analytics/timeline', {
      params: queryParams
    });
    return response.data.data;
  }

  async getTopSources(params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>('/analytics/sources/top', {
      params: this.buildAnalyticsQuery(params)
    });
    return response.data.data;
  }

  async getTopLanguages(params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>('/analytics/languages/top', {
      params: this.buildAnalyticsQuery(params)
    });
    return response.data.data;
  }

  async getLocationAnalytics(region: string, params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>(
      `/analytics/location/${encodeURIComponent(region)}`,
      {
        params: this.buildAnalyticsQuery(params)
      }
    );
    return response.data.data;
  }

  async getWeekdayPopularity(params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>(
      '/analytics/popularity/weekday',
      {
        params: this.buildAnalyticsQuery(params)
      }
    );
    return response.data.data;
  }

  async getHourPopularity(params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>('/analytics/popularity/hour', {
      params: this.buildAnalyticsQuery(params)
    });
    return response.data.data;
  }

  async getRawAnalytics(params: AnalyticsParams): Promise<unknown> {
    let response = await this.axios.get<ApiResponse<unknown>>('/analytics/raw/json', {
      params: this.buildAnalyticsQuery(params)
    });
    return response.data.data;
  }

  private buildAnalyticsQuery(params: AnalyticsParams): Record<string, string> {
    let query: Record<string, string> = {};
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.alias) query.alias = params.alias;
    if (params.tag) query.tag = params.tag;
    return query;
  }
}
