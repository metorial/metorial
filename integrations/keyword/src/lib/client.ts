import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(private config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://app.keyword.com'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Projects ──────────────────────────────────────────────

  async listProjects() {
    let response = await this.http.get('/api/v2/groups/active', {
      headers: this.headers
    });
    return response.data;
  }

  async getProject(projectName: string) {
    let response = await this.http.get(`/api/v2/groups/${encodeURIComponent(projectName)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createProject(params: { name: string; currencyCode?: string }) {
    let body: Record<string, any> = {
      category: params.name
    };
    if (params.currencyCode) body.currency_code = params.currencyCode;

    let response = await this.http.post('/api/v2/groups', body, {
      headers: this.headers
    });
    return response.data;
  }

  async archiveProject(projectName: string) {
    let response = await this.http.put(
      `/api/v2/groups/${encodeURIComponent(projectName)}`,
      { status: 2 },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async restoreProject(projectName: string) {
    let response = await this.http.get(
      `/api/v2/groups/${encodeURIComponent(projectName)}/undo/archive`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteProject(projectName: string) {
    let response = await this.http.delete(
      `/api/v2/groups/${encodeURIComponent(projectName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Keywords ──────────────────────────────────────────────

  async listKeywords(params: {
    projectName: string;
    page?: number;
    perPage?: number;
    date?: string;
  }) {
    let query: Record<string, any> = {};
    if (params.page) query.page = params.page;
    if (params.perPage) query.per_page = params.perPage;
    if (params.date) query.date = params.date;

    let response = await this.http.get(
      `/api/v2/groups/${encodeURIComponent(params.projectName)}/keywords/`,
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }

  async getKeyword(params: { projectName: string; keywordId: string; date?: string }) {
    let url = `/api/v2/groups/${encodeURIComponent(params.projectName)}/keywords/${params.keywordId}`;
    let query: Record<string, any> = {};
    if (params.date) query.date = params.date;

    let response = await this.http.get(url, {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async addKeywords(params: {
    projectName: string;
    keywords: Array<{
      keyword: string;
      url: string;
      region?: string;
      language?: string;
      tags?: string[];
      device?: 'desktop' | 'mobile';
      ignoreLocalPack?: boolean;
      urlTrackingMethod?: string;
      ignoreSubDomains?: boolean;
    }>;
  }) {
    let body = params.keywords.map(kw => ({
      type: 'keyword',
      category: params.projectName,
      kw: kw.keyword,
      url: kw.url,
      region: kw.region || 'google.com',
      language: kw.language || 'en',
      tags: kw.tags || [],
      se_type: kw.device === 'mobile' ? 'sem' : 'se',
      ignore_local: kw.ignoreLocalPack ? 1 : 0,
      url_tracking_method: kw.urlTrackingMethod || 'exact',
      ignore_sub_domains: kw.ignoreSubDomains ? 1 : 0
    }));

    let response = await this.http.post(
      `/api/v2/groups/${encodeURIComponent(params.projectName)}/keywords`,
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteKeyword(params: { projectName: string; keywordId: string }) {
    let response = await this.http.delete(
      `/api/v2/groups/${encodeURIComponent(params.projectName)}/keywords/${params.keywordId}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Ranking Data ──────────────────────────────────────────

  async getRankingHistory(params: { keywordIds: string[]; limit?: number }) {
    let query: Record<string, any> = {
      action: 'chart'
    };
    if (params.limit) query.limit = params.limit;

    let response = await this.http.post(
      '/api/v2/keywords/chart',
      {
        keyword_ids: params.keywordIds
      },
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }

  async getKeywordMetrics(params: {
    projectName: string;
    tagId?: string;
    timeframe?: string;
  }) {
    let query: Record<string, any> = {};
    if (params.tagId) query.tagId = params.tagId;
    if (params.timeframe) query.timeframe = params.timeframe;

    let response = await this.http.get(
      `/api/v2/groups/${encodeURIComponent(params.projectName)}/metrics`,
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }

  // ── Regions ───────────────────────────────────────────────

  async listRegions(projectName: string) {
    let response = await this.http.get(
      `/api/v2/groups/${encodeURIComponent(projectName)}/regions`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Refresh ───────────────────────────────────────────────

  async refreshKeywords(params: { projectIds: string[]; includeSubGroups?: boolean }) {
    let response = await this.http.post(
      '/api/v2/keywords/refresh',
      {
        project_ids: params.projectIds,
        include_sub_groups: params.includeSubGroups ?? true
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── AI Visibility - Domains ───────────────────────────────

  async listAiDomains() {
    let response = await this.http.get('/api/v2/ai-visibility/domains', {
      headers: this.headers
    });
    return response.data;
  }

  async getAiDomain(domainId: string) {
    let response = await this.http.get(`/api/v2/ai-visibility/domains/${domainId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── AI Visibility - Search Terms ──────────────────────────

  async listAiSearchTerms(domainId: string) {
    let response = await this.http.get(
      `/api/v2/ai-visibility/domains/${domainId}/search-terms`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── AI Visibility - Metrics ───────────────────────────────

  async getAiMetrics(params: {
    domainId: string;
    topics?: string[];
    searchTerms?: string[];
    engines?: string[];
    timeframe?: string;
    periodOffset?: number;
    aggregation?: string;
  }) {
    let query: Record<string, any> = {};
    if (params.topics) {
      params.topics.forEach(t => {
        query['topics[]'] = query['topics[]'] || [];
        query['topics[]'].push(t);
      });
    }
    if (params.searchTerms) {
      params.searchTerms.forEach(s => {
        query['search_terms[]'] = query['search_terms[]'] || [];
        query['search_terms[]'].push(s);
      });
    }
    if (params.engines) {
      params.engines.forEach(e => {
        query['engine[]'] = query['engine[]'] || [];
        query['engine[]'].push(e);
      });
    }
    if (params.timeframe) query.timeframe = params.timeframe;
    if (params.periodOffset !== undefined) query.period_offset = params.periodOffset;
    if (params.aggregation) query.aggregation = params.aggregation;

    let response = await this.http.get(
      `/api/v2/ai-visibility/domains/${params.domainId}/metrics`,
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }

  // ── AI Visibility - Sentiment ─────────────────────────────

  async getAiSentiment(params: {
    domainId: string;
    topics?: string[];
    searchTerms?: string[];
  }) {
    let query: Record<string, any> = {};
    if (params.topics) {
      params.topics.forEach(t => {
        query['topics[]'] = query['topics[]'] || [];
        query['topics[]'].push(t);
      });
    }
    if (params.searchTerms) {
      params.searchTerms.forEach(s => {
        query['search_terms[]'] = query['search_terms[]'] || [];
        query['search_terms[]'].push(s);
      });
    }

    let response = await this.http.get(
      `/api/v2/ai-visibility/domains/${params.domainId}/metrics/sentiment`,
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }

  // ── AI Visibility - Citations ─────────────────────────────

  async getAiCitations(params: {
    domainId: string;
    topics?: string[];
    searchTerms?: string[];
  }) {
    let query: Record<string, any> = {};
    if (params.topics) {
      params.topics.forEach(t => {
        query['topics[]'] = query['topics[]'] || [];
        query['topics[]'].push(t);
      });
    }
    if (params.searchTerms) {
      params.searchTerms.forEach(s => {
        query['search_terms[]'] = query['search_terms[]'] || [];
        query['search_terms[]'].push(s);
      });
    }

    let response = await this.http.get(
      `/api/v2/ai-visibility/domains/${params.domainId}/metrics/citations`,
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }
}
