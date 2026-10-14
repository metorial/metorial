import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';

interface ClientConfig {
  token: string;
}

export class MozClient {
  private v2: ReturnType<typeof createAxios>;
  private v3: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Moz API token or legacy credentials are required.');
    }

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
      headers: v2Headers,
      timeout: 30000
    });

    this.v3 = createAxios({
      baseURL: 'https://api.moz.com',
      headers: v3Headers,
      timeout: 30000
    });
  }

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    if (
      typeof body.limit === 'number' &&
      (!Number.isSafeInteger(body.limit) || body.limit < 1 || body.limit > 50)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 50.');
    }
    return requestAxiosData<any>(
      path,
      () => this.v2.post(path, body),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Moz',
          reason: 'moz_api_error',
          operation
        })
    );
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

    return this.post('/url_metrics', body);
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

    return this.post('/links', body);
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

    return this.post('/anchor_text', body);
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

    return this.post('/linking_root_domains', body);
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

    return this.post('/top_pages', body);
  }

  async getGlobalTopPages(params: { limit?: number; nextToken?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    return this.post('/global_top_pages', body);
  }

  async getGlobalTopRootDomains(params: { limit?: number; nextToken?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.limit) body.limit = params.limit;
    if (params.nextToken) body.next_token = params.nextToken;

    return this.post('/global_top_root_domains', body);
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
    if (params.isLinkingTo.length + (params.notLinkingTo?.length ?? 0) > 6) {
      throw createApiServiceError('Provide at most 6 combined positive and negative targets.');
    }
    if (
      params.minimumMatchingTargets !== undefined &&
      (!Number.isSafeInteger(params.minimumMatchingTargets) ||
        params.minimumMatchingTargets < 1 ||
        params.minimumMatchingTargets > params.isLinkingTo.length)
    ) {
      throw createApiServiceError(
        'minimumMatchingTargets must be a whole number between 1 and the number of positive targets.'
      );
    }
    if (params.sourceScope === 'subdomain') {
      throw createApiServiceError('Link intersect sourceScope must be page or root_domain.');
    }
    let body: Record<string, unknown> = {
      positive_targets: params.isLinkingTo.map(({ query, scope }) => ({
        target: query,
        scope
      }))
    };
    if (params.notLinkingTo)
      body.negative_targets = params.notLinkingTo.map(({ query, scope }) => ({
        target: query,
        scope
      }));
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.nextToken !== undefined) body.next_token = params.nextToken;
    if (params.minimumMatchingTargets !== undefined)
      body.min_matching_targets = params.minimumMatchingTargets;
    if (params.sourceScope !== undefined) body.source_scope = params.sourceScope;
    if (params.sort !== undefined) body.sort = params.sort;

    return this.post('/link_intersect', body);
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

    return this.post('/link_status', body);
  }

  async getIndexMetadata(): Promise<any> {
    return this.post('/index_metadata', {});
  }

  async getUsageData(params: { start?: string; end?: string }): Promise<any> {
    for (let value of [params.start, params.end]) {
      if (
        value !== undefined &&
        (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
      ) {
        throw createApiServiceError(
          'Usage timestamps must be Unix seconds expressed as whole-number strings.'
        );
      }
    }
    if (
      params.start !== undefined &&
      params.end !== undefined &&
      Number(params.start) >= Number(params.end)
    ) {
      throw createApiServiceError(
        'The usage start timestamp must be earlier than the end timestamp.'
      );
    }
    let body: Record<string, any> = {};
    if (params.start !== undefined) body.start = params.start;
    if (params.end !== undefined) body.end = params.end;

    return this.post('/usage_data', body);
  }

  // --- V3 JSON-RPC Methods ---

  private async jsonrpc(method: string, data: Record<string, unknown>): Promise<any> {
    let response = await requestAxiosData<any>(
      method,
      () =>
        this.v3.post('/jsonrpc', {
          jsonrpc: '2.0',
          id: randomUUID(),
          method,
          params: { data }
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Moz',
          reason: 'moz_api_error',
          operation
        })
    );
    if (response?.error) {
      throw buildApiServiceError(
        { response: { status: response.error.status, data: response.error } },
        { providerLabel: 'Moz', reason: 'moz_rpc_error', operation: method }
      );
    }
    if (response?.result === undefined || response.result === null) {
      throw createApiServiceError(`Moz returned no result for ${method}.`);
    }
    return response.result;
  }

  private serpQuery(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }) {
    return {
      keyword: params.keyword,
      locale: params.locale ?? 'en-US',
      device: params.device === 'mobile' ? 'mobile_android' : (params.device ?? 'desktop'),
      engine: params.engine ?? 'google'
    };
  }

  async getKeywordMetrics(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.fetch', { serp_query: this.serpQuery(params) });
  }

  async getKeywordDifficulty(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.difficulty.fetch', {
      serp_query: this.serpQuery(params)
    });
  }

  async getKeywordVolume(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.volume.fetch', {
      serp_query: this.serpQuery(params)
    });
  }

  async getKeywordSuggestions(params: {
    keyword: string;
    locale?: string;
    limit?: number;
    page?: number;
    asyncCallId?: string;
  }): Promise<any> {
    let result = params.asyncCallId
      ? await this.jsonrpc('async.call.lookup', { id: params.asyncCallId })
      : await this.jsonrpc('data.keyword.suggestion.list', {
          serp_query: this.serpQuery(params),
          page: {
            n: params.page ?? 0,
            ...(params.limit !== undefined ? { limit: params.limit } : {})
          }
        });
    for (let poll = 0; poll <= 12; poll++) {
      let call = result?.async_call;
      if (!call) return result;
      if (call.action !== 'data.keyword.suggestion.list') {
        throw createApiServiceError(
          'The asyncCallId must identify a keyword suggestion request.'
        );
      }
      if (call.status === 'complete') {
        if (call.error) {
          throw buildApiServiceError(
            { response: { status: call.error.status, data: call.error } },
            { providerLabel: 'Moz', reason: 'moz_async_error', operation: call.action }
          );
        }
        if (call.result === null || call.result === undefined) {
          throw createApiServiceError(
            'Moz completed the keyword suggestion request without a result.'
          );
        }
        return call.result;
      }
      if (typeof call.id !== 'string' || !call.id) {
        throw createApiServiceError('Moz returned an asynchronous request without an ID.');
      }
      if (poll === 12 || call.ttl <= 5) {
        throw createApiServiceError(
          `Moz keyword suggestions are still pending. Retry with asyncCallId "${call.id}" before the request expires.`,
          { reason: 'moz_async_pending' }
        );
      }
      await setTimeout(5000);
      result = await this.jsonrpc('async.call.lookup', { id: call.id });
    }
  }

  async getSearchIntent(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.intent.fetch', {
      serp_query: this.serpQuery(params)
    });
  }

  async getKeywordOpportunity(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.opportunity.fetch', {
      serp_query: this.serpQuery(params)
    });
  }

  async getKeywordPriority(params: {
    keyword: string;
    locale?: string;
    device?: string;
    engine?: string;
  }): Promise<any> {
    return this.jsonrpc('data.keyword.metrics.priority.fetch', {
      serp_query: this.serpQuery(params)
    });
  }

  async getBrandAuthority(params: { query: string; scope?: string }): Promise<any> {
    let data = { site_query: { query: params.query, scope: params.scope ?? 'domain' } };
    return this.jsonrpc('data.site.metrics.brand.authority.fetch', data);
  }

  async getSiteMetrics(params: { query: string; scope?: string }): Promise<any> {
    let data = { site_query: { query: params.query, scope: params.scope ?? 'domain' } };
    return this.jsonrpc('data.site.metrics.fetch', data);
  }

  async getSiteMetricsMultiple(params: { sites: string[] }): Promise<any> {
    return this.jsonrpc('data.site.metrics.fetch.multiple', {
      site_queries: params.sites.map(query => ({ query, scope: 'domain' }))
    });
  }

  async getRankingKeywords(params: {
    site: string;
    engine?: string;
    locale?: string;
    limit?: number;
    page?: number;
  }): Promise<any> {
    if (params.engine && params.engine !== 'google') {
      throw createApiServiceError('Moz ranking keyword data is available for Google only.');
    }
    return this.jsonrpc('data.site.ranking-keyword.list', {
      target_query: { query: params.site, scope: 'domain', locale: params.locale ?? 'en-US' },
      page: {
        n: params.page ?? 0,
        ...(params.limit !== undefined ? { limit: params.limit } : {})
      }
    });
  }

  async getFinalRedirect(query: string): Promise<any> {
    return this.jsonrpc('data.site.redirect.fetch', { site_query: { query, scope: 'url' } });
  }

  async getQuota(path = 'api.limits.data.rows'): Promise<any> {
    return this.jsonrpc('quota.lookup', {
      path
    });
  }
}
