import { createAxios } from 'slates';

interface ClientConfig {
  token: string;
}

export class MozClient {
  private v2: ReturnType<typeof createAxios>;
  private v3: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: ClientConfig) {
    this.token = config.token;

    let isBasicAuth = config.token.startsWith('Basic ');

    let v2Headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    let v3Headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (isBasicAuth) {
      v2Headers.Authorization = config.token;
      v3Headers.Authorization = config.token;
    } else {
      v2Headers['x-moz-token'] = config.token;
      v3Headers['x-moz-token'] = config.token;
    }

    this.v2 = createAxios({
      baseURL: 'https://lsapi.seomoz.com/v2',
      headers: v2Headers
    });

    this.v3 = createAxios({
      baseURL: 'https://api.moz.com',
      headers: v3Headers
    });
  }

  // --- V2 REST Methods ---

  async getUrlMetrics(params: {
    targets: string[];
    dailyHistoryDeltas?: string[];
    dailyHistoryValues?: string[];
    monthlyHistoryDeltas?: string[];
    monthlyHistoryValues?: string[];
    distributions?: boolean;
  }): Promise<any> {
    let body: Record<string, any> = {
      targets: params.targets
    };
    if (params.dailyHistoryDeltas) body.daily_history_deltas = params.dailyHistoryDeltas;
    if (params.dailyHistoryValues) body.daily_history_values = params.dailyHistoryValues;
    if (params.monthlyHistoryDeltas) body.monthly_history_deltas = params.monthlyHistoryDeltas;
    if (params.monthlyHistoryValues) body.monthly_history_values = params.monthlyHistoryValues;
    if (params.distributions !== undefined) body.distributions = params.distributions;

    let response = await this.v2.post('/url_metrics', body);
    return response.data;
  }

  async getLinks(params: {
    target: string;
    targetScope?: string;
    sourceScope?: string;
    sort?: string;
    filter?: string;
    anchorText?: string;
    sourceRootDomain?: string;
    limit?: number;
    nextToken?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      target: params.target
    };
    if (params.targetScope) body.target_scope = params.targetScope;
    if (params.sourceScope) body.source_scope = params.sourceScope;
    if (params.sort) body.sort = params.sort;
    if (params.filter) body.filter = params.filter;
    if (params.anchorText) body.anchor_text = params.anchorText;
    if (params.sourceRootDomain) body.source_root_domain = params.sourceRootDomain;
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    let response = await this.v2.post('/links', body);
    return response.data;
  }

  async getAnchorText(params: {
    target: string;
    scope?: string;
    limit?: number;
    nextToken?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      target: params.target
    };
    if (params.scope) body.scope = params.scope;
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    let response = await this.v2.post('/anchor_text', body);
    return response.data;
  }

  async getLinkingRootDomains(params: {
    target: string;
    targetScope?: string;
    sort?: string;
    filter?: string;
    limit?: number;
    nextToken?: string;
    beginDate?: string;
    endDate?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      target: params.target
    };
    if (params.targetScope) body.target_scope = params.targetScope;
    if (params.sort) body.sort = params.sort;
    if (params.filter) body.filter = params.filter;
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;
    if (params.beginDate) body.begin_date = params.beginDate;
    if (params.endDate) body.end_date = params.endDate;

    let response = await this.v2.post('/linking_root_domains', body);
    return response.data;
  }

  async getTopPages(params: {
    target: string;
    scope?: string;
    sort?: string;
    filter?: string;
    limit?: number;
    nextToken?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      target: params.target
    };
    if (params.scope) body.scope = params.scope;
    if (params.sort) body.sort = params.sort;
    if (params.filter) body.filter = params.filter;
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    let response = await this.v2.post('/top_pages', body);
    return response.data;
  }

  async getGlobalTopPages(params: { limit?: number; nextToken?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    let response = await this.v2.post('/global_top_pages', body);
    return response.data;
  }

  async getGlobalTopRootDomains(params: { limit?: number; nextToken?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    let response = await this.v2.post('/global_top_root_domains', body);
    return response.data;
  }

  async getLinkIntersect(params: {
    isLinkingTo: Array<{ query: string; scope: string }>;
    notLinkingTo?: Array<{ query: string; scope: string }>;
    limit?: number;
    nextToken?: string;
    minimumMatchingTargets?: number;
    sourceScope?: string;
    sort?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      is_linking_to: params.isLinkingTo
    };
    if (params.notLinkingTo) body.not_linking_to = params.notLinkingTo;

    let offset: Record<string, any> = {};
    if (params.limit) offset.limit = params.limit;
    if (params.nextToken) offset.token = params.nextToken;
    if (Object.keys(offset).length > 0) body.offset = offset;

    let options: Record<string, any> = {};
    if (params.minimumMatchingTargets)
      options.minimum_matching_targets = params.minimumMatchingTargets;
    if (params.sourceScope) options.scope = params.sourceScope;
    if (params.sort) options.sort = params.sort;
    if (Object.keys(options).length > 0) body.options = options;

    let response = await this.v2.post('/link_intersect', body);
    return response.data;
  }

  async getLinkStatus(params: {
    target: string;
    sources: string[];
    targetScope?: string;
    sourceScope?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      target: params.target,
      sources: params.sources
    };
    if (params.targetScope) body.target_scope = params.targetScope;
    if (params.sourceScope) body.source_scope = params.sourceScope;

    let response = await this.v2.post('/link_status', body);
    return response.data;
  }

  async getIndexMetadata(): Promise<any> {
    let response = await this.v2.post('/index_metadata', {});
    return response.data;
  }

  async getUsageData(params: { start?: string; end?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.start) body.start = params.start;
    if (params.end) body.end = params.end;

    let response = await this.v2.post('/usage_data', body);
    return response.data;
  }

  // --- V3 JSON-RPC Methods ---

  private generateId(): string {
    let chars = 'abcdef0123456789';
    let segments = [8, 4, 4, 4, 12];
    return segments
      .map(len => {
        let s = '';
        for (let i = 0; i < len; i++) {
          s += chars[Math.floor(Math.random() * chars.length)];
        }
        return s;
      })
      .join('-');
  }

  private async jsonrpc(method: string, data: Record<string, any>): Promise<any> {
    let response = await this.v3.post('/jsonrpc', {
      jsonrpc: '2.0',
      id: this.generateId(),
      method,
      params: { data }
    });
    return response.data?.result;
  }

  async getKeywordMetrics(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.fetch', {
      keyword: params.keyword,
      locale: params.locale || 'en-US',
      device: params.device || 'desktop',
      engine: params.engine || 'google'
    });
  }

  async getKeywordDifficulty(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.difficulty.fetch', {
      keyword: params.keyword,
      locale: params.locale || 'en-US',
      device: params.device || 'desktop',
      engine: params.engine || 'google'
    });
  }

  async getKeywordVolume(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.volume.fetch', {
      keyword: params.keyword,
      locale: params.locale || 'en-US',
      device: params.device || 'desktop',
      engine: params.engine || 'google'
    });
  }

  async getKeywordSuggestions(params: {
    keyword: string;
    locale?: string;
    limit?: number;
  }): Promise<any> {
    let data: Record<string, any> = {
      keyword: params.keyword,
      locale: params.locale || 'en-US'
    };
    if (params.limit) data.limit = params.limit;
    return this.jsonrpc('data.keyword.suggestions.list', data);
  }

  async getSearchIntent(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.search.intent.fetch', {
      keyword: params.keyword,
      locale: params.locale || 'en-US',
      device: params.device || 'desktop',
      engine: params.engine || 'google'
    });
  }

  async getKeywordOpportunity(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.opportunity.fetch', {
      keyword: params.keyword,
      locale: params.locale || 'en-US',
      device: params.device || 'desktop',
      engine: params.engine || 'google'
    });
  }

  async getKeywordPriority(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.priority.fetch', {
      keyword: params.keyword,
      locale: params.locale || 'en-US',
      device: params.device || 'desktop',
      engine: params.engine || 'google'
    });
  }

  async getBrandAuthority(params: { query: string; scope?: string }): Promise<any> {
    let data: Record<string, any> = { query: params.query };
    if (params.scope) data.scope = params.scope;
    return this.jsonrpc('data.site.metrics.brand.authority.fetch', data);
  }

  async getSiteMetrics(params: { query: string; scope?: string }): Promise<any> {
    let data: Record<string, any> = { query: params.query };
    if (params.scope) data.scope = params.scope;
    return this.jsonrpc('data.site.metrics.fetch', data);
  }

  async getSiteMetricsMultiple(params: { sites: string[] }): Promise<any> {
    return this.jsonrpc('data.site.metrics.fetch.multiple', {
      sites: params.sites
    });
  }

  async getRankingKeywords(params: {
    site: string;
    engine?: string;
    locale?: string;
    limit?: number;
  }): Promise<any> {
    let data: Record<string, any> = { site: params.site };
    if (params.engine) data.engine = params.engine;
    if (params.locale) data.locale = params.locale;
    if (params.limit) data.limit = params.limit;
    return this.jsonrpc('data.site.ranking.keywords.list', data);
  }

  async getQuota(): Promise<any> {
    return this.jsonrpc('quota.lookup', {
      path: 'api.limits.data.rows'
    });
  }
}
