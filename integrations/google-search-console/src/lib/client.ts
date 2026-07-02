import { createAxios } from 'slates';

export interface SearchAnalyticsQuery {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  searchType?: string;
  dimensionFilterGroups?: Array<{
    groupType?: string;
    filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }>;
  }>;
  aggregationType?: string;
  rowLimit?: number;
  startRow?: number;
  dataState?: string;
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResponse {
  rows: SearchAnalyticsRow[];
  responseAggregationType: string;
}

export interface Site {
  siteUrl: string;
  permissionLevel: string;
}

export interface Sitemap {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  errors?: number;
  warnings?: number;
  contents?: Array<{
    type: string;
    submitted?: number;
    indexed?: number;
  }>;
}

export interface UrlInspectionRequest {
  inspectionUrl: string;
  siteUrl: string;
  languageCode?: string;
}

export interface UrlInspectionResult {
  inspectionResultLink?: string;
  indexStatusResult?: {
    verdict?: string;
    coverageState?: string;
    robotsTxtState?: string;
    indexingState?: string;
    lastCrawlTime?: string;
    pageFetchState?: string;
    googleCanonical?: string;
    userCanonical?: string;
    sitemap?: string[];
    referringUrls?: string[];
    crawledAs?: string;
  };
  ampResult?: {
    verdict?: string;
    ampUrl?: string;
    robotsTxtState?: string;
    indexingState?: string;
    ampIndexStatusVerdict?: string;
    lastCrawlTime?: string;
    pageFetchState?: string;
    issues?: Array<{
      issueMessage?: string;
      severity?: string;
    }>;
  };
  mobileUsabilityResult?: {
    verdict?: string;
    issues?: Array<{
      issueType?: string;
      severity?: string;
      message?: string;
    }>;
  };
  richResultsResult?: {
    verdict?: string;
    detectedItems?: Array<{
      richResultType?: string;
      items?: Array<{
        name?: string;
        issues?: Array<{
          issueMessage?: string;
          severity?: string;
        }>;
      }>;
    }>;
  };
}

export interface MobileFriendlyTestRequest {
  url: string;
  requestScreenshot?: boolean;
}

export interface MobileFriendlyTestResponse {
  testStatus: {
    status: string;
    details?: string;
  };
  mobileFriendliness: string;
  mobileFriendlyIssues?: Array<{
    rule: string;
  }>;
  resourceIssues?: Array<{
    blockedResource: {
      url: string;
    };
  }>;
}

export class SearchConsoleClient {
  private webmastersApi;
  private searchConsoleApi;

  constructor(private token: string) {
    this.webmastersApi = createAxios({
      baseURL: 'https://www.googleapis.com/webmasters/v3'
    });
    this.searchConsoleApi = createAxios({
      baseURL: 'https://searchconsole.googleapis.com/v1'
    });
  }

  private get authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // Search Analytics

  async querySearchAnalytics(query: SearchAnalyticsQuery): Promise<SearchAnalyticsResponse> {
    let { siteUrl, ...body } = query;
    let encodedSiteUrl = encodeURIComponent(siteUrl);

    let response = await this.webmastersApi.post(
      `/sites/${encodedSiteUrl}/searchAnalytics/query`,
      body,
      { headers: this.authHeaders }
    );

    return {
      rows: response.data.rows || [],
      responseAggregationType: response.data.responseAggregationType
    };
  }

  // Sites

  async listSites(): Promise<Site[]> {
    let response = await this.webmastersApi.get('/sites', {
      headers: this.authHeaders
    });

    return response.data.siteEntry || [];
  }

  async getSite(siteUrl: string): Promise<Site> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);

    let response = await this.webmastersApi.get(`/sites/${encodedSiteUrl}`, {
      headers: this.authHeaders
    });

    return response.data;
  }

  async addSite(siteUrl: string): Promise<void> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);

    await this.webmastersApi.put(`/sites/${encodedSiteUrl}`, undefined, {
      headers: this.authHeaders
    });
  }

  async deleteSite(siteUrl: string): Promise<void> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);

    await this.webmastersApi.delete(`/sites/${encodedSiteUrl}`, {
      headers: this.authHeaders
    });
  }

  // Sitemaps

  async listSitemaps(siteUrl: string, sitemapIndex?: string): Promise<Sitemap[]> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);
    let params: Record<string, string> = {};
    if (sitemapIndex) {
      params.sitemapIndex = sitemapIndex;
    }

    let response = await this.webmastersApi.get(`/sites/${encodedSiteUrl}/sitemaps`, {
      headers: this.authHeaders,
      params
    });

    return response.data.sitemap || [];
  }

  async getSitemap(siteUrl: string, feedpath: string): Promise<Sitemap> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);
    let encodedFeedpath = encodeURIComponent(feedpath);

    let response = await this.webmastersApi.get(
      `/sites/${encodedSiteUrl}/sitemaps/${encodedFeedpath}`,
      { headers: this.authHeaders }
    );

    return response.data;
  }

  async submitSitemap(siteUrl: string, feedpath: string): Promise<void> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);
    let encodedFeedpath = encodeURIComponent(feedpath);

    await this.webmastersApi.put(
      `/sites/${encodedSiteUrl}/sitemaps/${encodedFeedpath}`,
      undefined,
      { headers: this.authHeaders }
    );
  }

  async deleteSitemap(siteUrl: string, feedpath: string): Promise<void> {
    let encodedSiteUrl = encodeURIComponent(siteUrl);
    let encodedFeedpath = encodeURIComponent(feedpath);

    await this.webmastersApi.delete(`/sites/${encodedSiteUrl}/sitemaps/${encodedFeedpath}`, {
      headers: this.authHeaders
    });
  }

  // URL Inspection

  async inspectUrl(request: UrlInspectionRequest): Promise<UrlInspectionResult> {
    let response = await this.searchConsoleApi.post('/urlInspection/index:inspect', request, {
      headers: this.authHeaders
    });

    return response.data.inspectionResult;
  }
}

// Mobile-Friendly Test uses a separate client since it uses API key auth
export class MobileFriendlyTestClient {
  private api;

  constructor() {
    this.api = createAxios({
      baseURL: 'https://searchconsole.googleapis.com/v1'
    });
  }

  async runTest(
    request: MobileFriendlyTestRequest,
    token: string
  ): Promise<MobileFriendlyTestResponse> {
    let response = await this.api.post('/urlTestingTools/mobileFriendlyTest:run', request, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  }
}
