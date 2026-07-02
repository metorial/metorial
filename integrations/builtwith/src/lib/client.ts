import { createAxios } from 'slates';

export interface DomainLookupOptions {
  domain: string;
  hideAll?: boolean;
  hideDescriptionAndLinks?: boolean;
  onlyLiveTechnologies?: boolean;
  noMetaData?: boolean;
  noAttributeData?: boolean;
  noPii?: boolean;
  firstDetectedSince?: string;
  lastDetectedSince?: string;
}

export interface ListsOptions {
  technology: string;
  includeMetaData?: boolean;
  offset?: number;
  since?: string;
}

export interface TrendsOptions {
  technology: string;
  date?: string;
}

export interface CompanyToUrlOptions {
  company: string;
  amount?: number;
  tld?: string;
}

export interface TrustOptions {
  domain: string;
  stopwords?: string;
  live?: boolean;
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAxios({
      baseURL: 'https://api.builtwith.com'
    });
  }

  private buildParams(
    extra: Record<string, string | number | boolean | undefined>
  ): Record<string, string | number | boolean | undefined> {
    return {
      KEY: this.token,
      ...extra
    };
  }

  async domainLookup(options: DomainLookupOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      LOOKUP: options.domain
    };

    if (options.hideAll) params.HIDETEXT = 'yes';
    if (options.hideDescriptionAndLinks) params.HIDEDL = 'yes';
    if (options.onlyLiveTechnologies) params.LIVEONLY = 'yes';
    if (options.noMetaData) params.NOMETA = 'yes';
    if (options.noAttributeData) params.NOATTR = 'yes';
    if (options.noPii) params.NOPII = 'yes';
    if (options.firstDetectedSince) params.FDRANGE = options.firstDetectedSince;
    if (options.lastDetectedSince) params.LDRANGE = options.lastDetectedSince;

    let response = await this.http.get('/v22/api.json', {
      params: this.buildParams(params)
    });
    return response.data;
  }

  async domainLive(domain: string) {
    let response = await this.http.get('/ddlv2/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }

  async lists(options: ListsOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      TECH: options.technology
    };
    if (options.includeMetaData) params.META = 'yes';
    if (options.offset !== undefined) params.OFFSET = options.offset;
    if (options.since) params.SINCE = options.since;

    let response = await this.http.get('/lists12/api.json', {
      params: this.buildParams(params)
    });
    return response.data;
  }

  async relationships(domain: string) {
    let response = await this.http.get('/rv4/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }

  async trends(options: TrendsOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      TECH: options.technology
    };
    if (options.date) params.DATE = options.date;

    let response = await this.http.get('/trends/v6/api.json', {
      params: this.buildParams(params)
    });
    return response.data;
  }

  async companyToUrl(options: CompanyToUrlOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      COMPANY: options.company
    };
    if (options.amount !== undefined) params.AMOUNT = options.amount;
    if (options.tld) params.TLD = options.tld;

    let response = await this.http.get('/ctu3/api.json', {
      params: this.buildParams(params)
    });
    return response.data;
  }

  async keywords(domains: string[]) {
    let response = await this.http.get('/kw2/api.json', {
      params: this.buildParams({ LOOKUP: domains.join(',') })
    });
    return response.data;
  }

  async trust(options: TrustOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      LOOKUP: options.domain
    };
    if (options.stopwords) params.WORDS = options.stopwords;
    if (options.live) params.LIVE = 'yes';

    let response = await this.http.get('/trustv1/api.json', {
      params: this.buildParams(params)
    });
    return response.data;
  }

  async redirects(domain: string) {
    let response = await this.http.get('/redirect1/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }

  async recommendations(domain: string) {
    let response = await this.http.get('/rec1/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }

  async tags(domain: string) {
    let response = await this.http.get('/tag1/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }

  async productSearch(query: string) {
    let response = await this.http.get('/productv1/api.json', {
      params: this.buildParams({ QUERY: query })
    });
    return response.data;
  }

  async freeLookup(domain: string) {
    let response = await this.http.get('/free1/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }

  async financial(domain: string) {
    let response = await this.http.get('/financialv1/api.json', {
      params: this.buildParams({ LOOKUP: domain })
    });
    return response.data;
  }
}
