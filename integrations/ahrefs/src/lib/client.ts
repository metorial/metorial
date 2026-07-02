import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.ahrefs.com/v3',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  // ─── Site Explorer ─────────────────────────────────────────

  async getDomainRating(params: { target: string; date?: string }) {
    let response = await this.axios.get('/site-explorer/domain-rating', {
      params: {
        target: params.target,
        date: params.date || today()
      }
    });
    return response.data;
  }

  async getBacklinksStats(params: { target: string; date?: string; mode?: string }) {
    let response = await this.axios.get('/site-explorer/backlinks-stats', {
      params: {
        target: params.target,
        date: params.date || today(),
        mode: params.mode
      }
    });
    return response.data;
  }

  async getOutlinksStats(params: { target: string; date?: string; mode?: string }) {
    let response = await this.axios.get('/site-explorer/outlinks-stats', {
      params: {
        target: params.target,
        date: params.date || today(),
        mode: params.mode
      }
    });
    return response.data;
  }

  async getMetrics(params: { target: string; date?: string; mode?: string }) {
    let response = await this.axios.get('/site-explorer/metrics', {
      params: {
        target: params.target,
        date: params.date || today(),
        mode: params.mode
      }
    });
    return response.data;
  }

  async getMetricsByCountry(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/metrics-by-country', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getBacklinks(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/all-backlinks', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getBrokenBacklinks(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/broken-backlinks', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getReferringDomains(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/refdomains', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getAnchors(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/anchors', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getOrganicKeywords(params: {
    target: string;
    date?: string;
    mode?: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/organic-keywords', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getOrganicCompetitors(params: {
    target: string;
    date?: string;
    mode?: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/organic-competitors', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getTopPages(params: {
    target: string;
    date?: string;
    mode?: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/top-pages', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getPaidPages(params: {
    target: string;
    date?: string;
    mode?: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/paid-pages', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getPagesByTraffic(params: {
    target: string;
    date?: string;
    mode?: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/pages-by-traffic', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getBestByExternalLinks(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/best-by-external-links', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getBestByInternalLinks(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/best-by-internal-links', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getLinkedDomains(params: {
    target: string;
    date?: string;
    mode?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-explorer/linked-domains', {
      params: buildParams(params)
    });
    return response.data;
  }

  // ─── Site Explorer History ─────────────────────────────────

  async getReferringDomainsHistory(params: {
    target: string;
    date_from?: string;
    date_to?: string;
    mode?: string;
  }) {
    let response = await this.axios.get('/site-explorer/refdomains-history', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getUrlRatingHistory(params: {
    target: string;
    date_from?: string;
    date_to?: string;
    mode?: string;
  }) {
    let response = await this.axios.get('/site-explorer/url-rating-history', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getMetricsHistory(params: {
    target: string;
    date_from?: string;
    date_to?: string;
    mode?: string;
  }) {
    let response = await this.axios.get('/site-explorer/metrics-history', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getKeywordsHistory(params: {
    target: string;
    date_from?: string;
    date_to?: string;
    mode?: string;
    country?: string;
  }) {
    let response = await this.axios.get('/site-explorer/keywords-history', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getPagesHistory(params: {
    target: string;
    date_from?: string;
    date_to?: string;
    mode?: string;
  }) {
    let response = await this.axios.get('/site-explorer/pages-history', {
      params: buildParams(params)
    });
    return response.data;
  }

  async getTotalSearchVolumeHistory(params: {
    target: string;
    date_from?: string;
    date_to?: string;
    mode?: string;
    country?: string;
  }) {
    let response = await this.axios.get('/site-explorer/total-search-volume-history', {
      params: buildParams(params)
    });
    return response.data;
  }

  // ─── Keywords Explorer ─────────────────────────────────────

  async getKeywordsOverview(params: {
    keyword?: string;
    keywords?: string[];
    country?: string;
    select?: string;
  }) {
    let queryParams: Record<string, string | undefined> = {
      country: params.country || 'us',
      select: params.select
    };

    if (params.keywords && params.keywords.length > 0) {
      queryParams.keywords = params.keywords.join(',');
    } else if (params.keyword) {
      queryParams.keyword = params.keyword;
    }

    let response = await this.axios.get('/keywords-explorer/overview', {
      params: cleanParams(queryParams)
    });
    return response.data;
  }

  async getVolumeByCountry(params: {
    keyword?: string;
    keywords?: string[];
    select?: string;
  }) {
    let queryParams: Record<string, string | undefined> = {
      select: params.select
    };

    if (params.keywords && params.keywords.length > 0) {
      queryParams.keywords = params.keywords.join(',');
    } else if (params.keyword) {
      queryParams.keyword = params.keyword;
    }

    let response = await this.axios.get('/keywords-explorer/volume-by-country', {
      params: cleanParams(queryParams)
    });
    return response.data;
  }

  async getVolumeHistory(params: {
    keyword?: string;
    keywords?: string[];
    country?: string;
    select?: string;
  }) {
    let queryParams: Record<string, string | undefined> = {
      country: params.country || 'us',
      select: params.select
    };

    if (params.keywords && params.keywords.length > 0) {
      queryParams.keywords = params.keywords.join(',');
    } else if (params.keyword) {
      queryParams.keyword = params.keyword;
    }

    let response = await this.axios.get('/keywords-explorer/volume-history', {
      params: cleanParams(queryParams)
    });
    return response.data;
  }

  async getMatchingTerms(params: {
    keyword: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/keywords-explorer/matching-terms', {
      params: buildParams({ ...params, country: params.country || 'us' })
    });
    return response.data;
  }

  async getRelatedTerms(params: {
    keyword: string;
    country?: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/keywords-explorer/related-terms', {
      params: buildParams({ ...params, country: params.country || 'us' })
    });
    return response.data;
  }

  // ─── SERP Overview ─────────────────────────────────────────

  async getSerpOverview(params: { keyword: string; country?: string; select?: string }) {
    let response = await this.axios.get('/serp-overview', {
      params: {
        keyword: params.keyword,
        country: params.country || 'us',
        select: params.select
      }
    });
    return response.data;
  }

  // ─── Rank Tracker ──────────────────────────────────────────

  async getRankTrackerOverview(params: { project_id: string; select?: string }) {
    let response = await this.axios.get('/rank-tracker/overview', {
      params: cleanParams({
        project_id: params.project_id,
        select: params.select
      })
    });
    return response.data;
  }

  async getRankTrackerCompetitorsOverview(params: {
    project_id: string;
    select?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/rank-tracker/competitors-overview', {
      params: buildParams({ ...params })
    });
    return response.data;
  }

  async getRankTrackerSerpOverview(params: {
    project_id: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/rank-tracker/serp-overview', {
      params: buildParams({ ...params })
    });
    return response.data;
  }

  // ─── Site Audit ────────────────────────────────────────────

  async getSiteAuditProjects() {
    let response = await this.axios.get('/site-audit/projects');
    return response.data;
  }

  async getSiteAuditHealthScore(params: { project_id: string }) {
    let response = await this.axios.get('/site-audit/health-score', {
      params: {
        project_id: params.project_id
      }
    });
    return response.data;
  }

  async getSiteAuditIssues(params: {
    project_id: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-audit/issues', {
      params: buildParams({ ...params })
    });
    return response.data;
  }

  async getSiteAuditPageExplorer(params: {
    project_id: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/site-audit/page-explorer', {
      params: buildParams({ ...params })
    });
    return response.data;
  }

  // ─── Brand Radar ───────────────────────────────────────────

  async getBrandRadarOverview(params: { target: string; select?: string }) {
    let response = await this.axios.get('/brand-radar/overview', {
      params: cleanParams({
        target: params.target,
        select: params.select
      })
    });
    return response.data;
  }

  async getBrandRadarSovHistory(params: {
    target: string;
    select?: string;
    date_from?: string;
    date_to?: string;
  }) {
    let response = await this.axios.get('/brand-radar/sov-history', {
      params: cleanParams({
        target: params.target,
        select: params.select,
        date_from: params.date_from,
        date_to: params.date_to
      })
    });
    return response.data;
  }

  async getBrandRadarAiResponses(params: {
    target: string;
    select?: string;
    where?: string;
    order_by?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/brand-radar/ai-responses', {
      params: buildParams({ ...params })
    });
    return response.data;
  }

  // ─── Batch Analysis ────────────────────────────────────────

  async batchAnalysis(params: { targets: string[]; date?: string; select?: string }) {
    let response = await this.axios.post('/batch-analysis', {
      targets: params.targets,
      date: params.date || today(),
      select: params.select
    });
    return response.data;
  }

  // ─── Management ────────────────────────────────────────────

  async listRankTrackerProjects() {
    let response = await this.axios.get('/management/rank-tracker/projects');
    return response.data;
  }

  async createRankTrackerProject(params: {
    name: string;
    target: string;
    keywords?: string[];
  }) {
    let response = await this.axios.post('/management/rank-tracker/projects', params);
    return response.data;
  }

  async deleteRankTrackerProject(params: { projectId: string }) {
    let response = await this.axios.delete(
      `/management/rank-tracker/projects/${params.projectId}`
    );
    return response.data;
  }

  async listRankTrackerKeywords(params: { projectId: string }) {
    let response = await this.axios.get(
      `/management/rank-tracker/projects/${params.projectId}/keywords`
    );
    return response.data;
  }

  async addRankTrackerKeywords(params: { projectId: string; keywords: string[] }) {
    let response = await this.axios.post(
      `/management/rank-tracker/projects/${params.projectId}/keywords`,
      {
        keywords: params.keywords
      }
    );
    return response.data;
  }

  async removeRankTrackerKeywords(params: { projectId: string; keywords: string[] }) {
    let response = await this.axios.delete(
      `/management/rank-tracker/projects/${params.projectId}/keywords`,
      {
        data: {
          keywords: params.keywords
        }
      }
    );
    return response.data;
  }

  // ─── Subscription Info ─────────────────────────────────────

  async getLimitsAndUsage() {
    let response = await this.axios.get('/subscription-info/limits-and-usage');
    return response.data;
  }
}

// ─── Helpers ─────────────────────────────────────────────────

let today = (): string => {
  let d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let cleanParams = (
  params: Record<string, string | number | boolean | undefined | null>
): Record<string, string | number | boolean> => {
  let result: Record<string, string | number | boolean> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
};

let buildParams = (
  params: Record<string, string | number | boolean | string[] | undefined | null>
): Record<string, string | number | boolean> => {
  let result: Record<string, string | number | boolean> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.join(',');
      } else {
        result[key] = value;
      }
    }
  }
  if (!result.date && !result.date_from) {
    // Some endpoints require a date; add today as default only if param key exists in original
    // We handle this at the method level instead
  }
  return result;
};
