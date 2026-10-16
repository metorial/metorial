import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { requireDate, requireInteger, requireText } from './response';

type KeywordInput = {
  keyword: string;
  url: string;
  region?: string;
  language?: string;
  tags?: string[];
  device?: 'desktop' | 'mobile';
  ignoreLocalPack?: boolean;
  urlTrackingMethod?: string;
  ignoreSubDomains?: boolean;
};

export class Client {
  private http;

  constructor(config: { token: string }) {
    requireText(config.token, 'API token');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.keyword.com',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Keyword.com',
          reason: 'keyword_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['title', 'message', 'detail', 'code'],
          extractUpstreamCode: (_error, response, helpers) => {
            if (!helpers.isRecord(response?.data)) return undefined;
            let errors = response.data.errors;
            let first = Array.isArray(errors) ? errors[0] : errors;
            return helpers.isRecord(first) && typeof first.code === 'string'
              ? first.code
              : undefined;
          }
        })
    });
  }

  private projectPath(projectName: string) {
    requireText(projectName, 'Project name');
    return `/api/v2/groups/${encodeURIComponent(projectName)}`;
  }

  private keywordPath(projectName: string, keywordId: string) {
    requireText(keywordId, 'Keyword ID');
    return `${this.projectPath(projectName)}/keywords/${encodeURIComponent(keywordId)}`;
  }

  private domainPath(domainId: string) {
    requireText(domainId, 'AI Visibility domain ID');
    return `/api/v2/ai-visibility/domains/${encodeURIComponent(domainId)}`;
  }

  private aiFilters(params: { topics?: string[]; searchTerms?: string[] }) {
    let query = new URLSearchParams();
    for (let topic of params.topics ?? []) query.append('topics[]', topic);
    for (let term of params.searchTerms ?? []) query.append('search_terms[]', term);
    return query;
  }

  async getCurrentUser(includeSubscriptions = false) {
    return (
      await this.http.get('/api/v2/users/self', {
        params: includeSubscriptions ? { include: 'subscriptions' } : undefined
      })
    ).data;
  }

  async listProjects() {
    return (await this.http.get('/api/v2/groups/active')).data;
  }

  async getProject(projectName: string) {
    return (await this.http.get(this.projectPath(projectName))).data;
  }

  async createProject(params: { name: string; currencyCode?: string }) {
    requireText(params.name, 'Project name');
    return (
      await this.http.post('/api/v2/groups', {
        data: {
          type: 'group',
          attributes: pickDefined({
            category: params.name,
            currency_code: params.currencyCode
          })
        }
      })
    ).data;
  }

  async archiveProject(projectName: string) {
    return (
      await this.http.put(this.projectPath(projectName), {
        data: { type: 'group', attributes: { status: 2 } }
      })
    ).data;
  }

  async restoreProject(projectName: string) {
    return (await this.http.get(`${this.projectPath(projectName)}/undo/archive`)).data;
  }

  async deleteProject(projectName: string) {
    return (await this.http.delete(this.projectPath(projectName))).data;
  }

  async listKeywords(params: {
    projectName: string;
    page?: number;
    perPage?: number;
    date?: string;
  }) {
    requireInteger(params.page, 'page', 1);
    requireInteger(params.perPage, 'perPage', 1);
    requireDate(params.date, 'date');
    return (
      await this.http.get(`${this.projectPath(params.projectName)}/keywords`, {
        params: pickDefined({ page: params.page, per_page: params.perPage, date: params.date })
      })
    ).data;
  }

  async getKeyword(params: { projectName: string; keywordId: string; date?: string }) {
    requireDate(params.date, 'date');
    return (
      await this.http.get(this.keywordPath(params.projectName, params.keywordId), {
        params: pickDefined({ date: params.date })
      })
    ).data;
  }

  async addKeywords(params: { projectName: string; keywords: KeywordInput[] }) {
    let data = params.keywords.map(kw => {
      requireText(kw.keyword, 'Keyword text', 150);
      requireText(kw.url, 'Tracked URL');
      requireText(kw.region, 'Keyword region');
      requireText(kw.language, 'Keyword language');
      let trackingMethod = kw.urlTrackingMethod === 'domain' ? 'broad' : kw.urlTrackingMethod;
      if (trackingMethod !== undefined && !['broad', 'exact'].includes(trackingMethod)) {
        throw createApiServiceError(
          'urlTrackingMethod must be broad, exact, or the legacy domain alias.'
        );
      }
      return {
        type: 'keyword',
        attributes: pickDefined({
          category: params.projectName,
          kw: kw.keyword,
          url: kw.url,
          region: kw.region,
          language: kw.language,
          tags: kw.tags,
          type: kw.device === undefined ? undefined : kw.device === 'mobile' ? 'sem' : 'se',
          ignore_local: kw.ignoreLocalPack,
          url_tracking_method: trackingMethod,
          ignore_sub_domains: kw.ignoreSubDomains,
          source: 1
        })
      };
    });
    return (await this.http.post(`${this.projectPath(params.projectName)}/keywords`, { data }))
      .data;
  }

  async deleteKeyword(params: { projectName: string; keywordId: string }) {
    return (await this.http.delete(this.keywordPath(params.projectName, params.keywordId)))
      .data;
  }

  async updateKeyword(params: {
    projectName: string;
    keywordId: string;
    attributes: Record<string, unknown>;
  }) {
    return (
      await this.http.patch(this.keywordPath(params.projectName, params.keywordId), {
        data: { type: 'keyword', attributes: params.attributes }
      })
    ).data;
  }

  async getRankingHistory(params: { keywordIds: string[]; limit?: number }) {
    requireInteger(params.limit, 'historyDays', 1, 180);
    for (let id of params.keywordIds) requireText(id, 'Keyword ID');
    return (
      await this.http.post(
        '/api/v2/keywords/chart',
        { kwid: params.keywordIds },
        { params: pickDefined({ action: 'bulkChart', limit: params.limit }) }
      )
    ).data;
  }

  async getKeywordMetrics(params: {
    projectName: string;
    tagId?: string;
    timeframe?: string;
  }) {
    return (
      await this.http.get(`${this.projectPath(params.projectName)}/metrics`, {
        params: pickDefined({ tagId: params.tagId, timeframe: params.timeframe })
      })
    ).data;
  }

  async getKeywordCompetitors(params: {
    projectName: string;
    keywordId: string;
    startDate: string;
    endDate: string;
  }) {
    requireText(params.projectName, 'Project name');
    requireText(params.keywordId, 'Keyword ID');
    requireDate(params.startDate, 'startDate');
    requireDate(params.endDate, 'endDate');
    if (params.endDate < params.startDate) {
      throw createApiServiceError('endDate must be on or after startDate.');
    }
    return (
      await this.http.get(
        `/api/v2/metrics/${encodeURIComponent(params.projectName)}/competitors/${encodeURIComponent(params.keywordId)}/history`,
        { params: { dateRange: `${params.startDate}.${params.endDate}` } }
      )
    ).data;
  }

  async getShareOfVoice(projectName: string) {
    requireText(projectName, 'Project name');
    return (
      await this.http.get(
        `/api/v2/metrics/${encodeURIComponent(projectName)}/mindshare/latest`
      )
    ).data;
  }

  async listRegions(projectName: string) {
    return (await this.http.get(`${this.projectPath(projectName)}/regions`)).data;
  }

  async refreshKeywords(params: { projectIds: string[]; includeSubGroups?: boolean }) {
    for (let id of params.projectIds) requireText(id, 'Project ID');
    return (
      await this.http.post('/api/v2/keywords/refresh', {
        data: pickDefined({
          project_ids: params.projectIds,
          include_sub_groups: params.includeSubGroups
        })
      })
    ).data;
  }

  async listAiDomains(page?: number) {
    requireInteger(page, 'page', 1);
    return (
      await this.http.get('/api/v2/ai-visibility/domains', { params: pickDefined({ page }) })
    ).data;
  }

  async getAiDomain(domainId: string) {
    return (await this.http.get(this.domainPath(domainId))).data;
  }

  async listAiSearchTerms(domainId: string) {
    return (await this.http.get(`${this.domainPath(domainId)}/search-terms`)).data;
  }

  async getAiMetrics(params: {
    domainId: string;
    topics?: string[];
    searchTerms?: string[];
    engines?: string[];
    timeframe?: string;
    periodOffset?: number;
    aggregation?: string;
  }) {
    requireInteger(params.periodOffset, 'periodOffset', -365, 0);
    let query = this.aiFilters(params);
    for (let engine of params.engines ?? []) query.append('engines[]', engine);
    if (params.timeframe !== undefined) query.set('timeframe', params.timeframe);
    if (params.periodOffset !== undefined)
      query.set('period_offset', String(params.periodOffset));
    if (params.aggregation !== undefined) query.set('aggregation', params.aggregation);
    return (
      await this.http.get(`${this.domainPath(params.domainId)}/metrics`, { params: query })
    ).data;
  }

  async getAiSentiment(params: {
    domainId: string;
    topics?: string[];
    searchTerms?: string[];
  }) {
    return (
      await this.http.get(`${this.domainPath(params.domainId)}/metrics/sentiment`, {
        params: this.aiFilters(params)
      })
    ).data;
  }

  async getAiCitations(params: {
    domainId: string;
    topics?: string[];
    searchTerms?: string[];
  }) {
    return (
      await this.http.get(`${this.domainPath(params.domainId)}/metrics/citations`, {
        params: this.aiFilters(params)
      })
    ).data;
  }
}
