import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.similarweb.com'
});

export interface GlobalRankEntry {
  date: string;
  globalRank: number;
}

export interface GlobalRankResponse {
  meta: {
    request: Record<string, unknown>;
    status: string;
    lastUpdated: string;
  };
  globalRank: GlobalRankEntry[];
}

export interface CountryRankEntry {
  date: string;
  countryRank: number;
}

export interface CountryRankResponse {
  meta: {
    request: Record<string, unknown>;
    status: string;
    lastUpdated: string;
  };
  countryRank: CountryRankEntry[];
}

export interface CategoryRankResponse {
  meta: {
    request: Record<string, unknown>;
    status: string;
  };
  category: string;
  rank: number;
}

export interface TopSiteEntry {
  rank: number;
  domain: string;
}

export interface TopSitesResponse {
  topSites: TopSiteEntry[];
}

export interface CapabilitiesResponse {
  remainingHits: number;
  [key: string]: unknown;
}

export class Client {
  constructor(private config: { token: string }) {}

  async getGlobalRank(params: {
    domain: string;
    startDate?: string;
    endDate?: string;
    mainDomainOnly?: boolean;
  }): Promise<GlobalRankResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.config.token,
      format: 'json'
    };

    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;
    if (params.mainDomainOnly !== undefined)
      queryParams.main_domain_only = String(params.mainDomainOnly);

    let response = await http.get(`/v1/website/${params.domain}/global-rank/global-rank`, {
      params: queryParams
    });

    let data = response.data as any;

    return {
      meta: {
        request: data.meta?.request ?? {},
        status: data.meta?.status ?? '',
        lastUpdated: data.meta?.last_updated ?? ''
      },
      globalRank: (data.global_rank ?? []).map((entry: any) => ({
        date: entry.date,
        globalRank: entry.global_rank
      }))
    };
  }

  async getCountryRank(params: {
    domain: string;
    country: string;
    startDate?: string;
    endDate?: string;
    mainDomainOnly?: boolean;
  }): Promise<CountryRankResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.config.token,
      format: 'json',
      country: params.country
    };

    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;
    if (params.mainDomainOnly !== undefined)
      queryParams.main_domain_only = String(params.mainDomainOnly);

    let response = await http.get(`/v1/website/${params.domain}/country-rank/country-rank`, {
      params: queryParams
    });

    let data = response.data as any;

    return {
      meta: {
        request: data.meta?.request ?? {},
        status: data.meta?.status ?? '',
        lastUpdated: data.meta?.last_updated ?? ''
      },
      countryRank: (data.country_rank ?? []).map((entry: any) => ({
        date: entry.date,
        countryRank: entry.country_rank
      }))
    };
  }

  async getCategoryRank(params: { domain: string }): Promise<CategoryRankResponse> {
    let response = await http.get(`/v1/website/${params.domain}/category-rank/category-rank`, {
      params: {
        api_key: this.config.token,
        format: 'json'
      }
    });

    let data = response.data as any;

    return {
      meta: {
        request: data.meta?.request ?? {},
        status: data.meta?.status ?? ''
      },
      category: data.category ?? '',
      rank: data.rank ?? 0
    };
  }

  async getTopSites(params: { limit?: number }): Promise<TopSitesResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.config.token,
      format: 'json'
    };

    if (params.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await http.get('/v1/TopSites', {
      params: queryParams
    });

    let data = response.data as any;

    let sites: TopSiteEntry[] = (data.top_sites ?? data ?? []).map((entry: any) => ({
      rank: entry.Rank ?? entry.rank,
      domain: entry.Site ?? entry.Domain ?? entry.domain ?? entry.site
    }));

    return { topSites: sites };
  }

  async getCapabilities(): Promise<CapabilitiesResponse> {
    let response = await http.get('/user-capabilities', {
      params: {
        api_key: this.config.token
      }
    });

    let data = response.data as any;

    return {
      remainingHits: data.remaining_hits ?? 0,
      ...data
    };
  }
}
