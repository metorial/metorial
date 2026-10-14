import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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
  offsetToken?: string;
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
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A BuiltWith API key is required.', {
        reason: 'builtwith_missing_api_key'
      });
    }
    this.token = config.token;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.builtwith.com',
      timeout: 60000,
      contentType: false,
      errorAdapter: error => this.apiError(error)
    });
  }

  private apiError(error: unknown) {
    return buildApiServiceError(error, {
      providerLabel: 'BuiltWith',
      reason: 'builtwith_api_error',
      detailKeys: ['Message', 'Code', 'message', 'code', 'error'],
      nestedKeys: ['Errors', 'errors'],
      extractResponse: (failure, helpers) => {
        let response = helpers.getResponse(failure);
        if (
          helpers.isRecord(failure) &&
          failure.name === 'SlateError' &&
          helpers.isRecord(failure.data) &&
          helpers.isRecord(failure.data.baggage) &&
          failure.data.baggage.response !== undefined
        ) {
          return { ...response, data: failure.data.baggage.response };
        }
        return response;
      },
      extractUpstreamCode: (_failure, response, helpers) => {
        let data = response?.data;
        let error =
          helpers.isRecord(data) && Array.isArray(data.Errors) ? data.Errors[0] : undefined;
        if (
          helpers.isRecord(error) &&
          (typeof error.Code === 'number' || typeof error.Code === 'string')
        ) {
          return String(error.Code);
        }
        return undefined;
      }
    });
  }

  private async get(
    path: string,
    params: Record<string, string | number | boolean | undefined>
  ) {
    let response = await this.http.get(path, { params: this.buildParams(params) });
    if (Array.isArray(response.data?.Errors) && response.data.Errors.length > 0) {
      throw this.apiError({ response: { status: response.status, data: response.data } });
    }
    return response.data;
  }

  private detectedRange(value: string | undefined, field: string) {
    if (value === undefined) return undefined;
    if (/^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    let date = /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
    if (!Number.isFinite(date.getTime())) {
      throw createApiServiceError(
        `${field} must be a date, Unix timestamp in milliseconds, or YYYY-MM-DD|YYYY-MM-DD range.`,
        {
          reason: 'builtwith_invalid_detection_date'
        }
      );
    }
    return `${date.toISOString().slice(0, 10)}|${new Date().toISOString().slice(0, 10)}`;
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
    params.FDRANGE = this.detectedRange(options.firstDetectedSince, 'firstDetectedSince');
    params.LDRANGE = this.detectedRange(options.lastDetectedSince, 'lastDetectedSince');

    return this.get('/v22/api.json', params);
  }

  async domainLive(domain: string) {
    return this.get('/ddlv2/api.json', { LOOKUP: domain });
  }

  async lists(options: ListsOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      TECH: options.technology
    };
    if (options.includeMetaData) params.META = 'yes';
    if (options.offset !== undefined && options.offsetToken !== undefined) {
      throw createApiServiceError('Provide offsetToken or offset, not both.', {
        reason: 'builtwith_conflicting_offset'
      });
    }
    if (options.offsetToken !== undefined) params.OFFSET = options.offsetToken;
    else if (options.offset !== undefined) params.OFFSET = options.offset;
    params.TECH = options.technology.replace(/\s+/g, '-');
    if (options.since) params.SINCE = options.since;

    return this.get('/lists12/api.json', params);
  }

  async relationships(domain: string) {
    return this.get('/rv4/api.json', { LOOKUP: domain });
  }

  async trends(options: TrendsOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      TECH: options.technology
    };
    if (options.date) params.DATE = options.date;

    return this.get('/trends/v6/api.json', params);
  }

  async companyToUrl(options: CompanyToUrlOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      COMPANY: options.company
    };
    if (options.amount !== undefined) params.AMOUNT = options.amount;
    if (options.tld) params.TLD = options.tld;

    return this.get('/ctu3/api.json', params);
  }

  async keywords(domains: string[]) {
    return this.get('/kw2/api.json', { LOOKUP: domains.join(',') });
  }

  async trust(options: TrustOptions) {
    let params: Record<string, string | number | boolean | undefined> = {
      LOOKUP: options.domain
    };
    if (options.stopwords) params.WORDS = options.stopwords;
    if (options.live) params.LIVE = 'yes';

    return this.get('/trustv1/api.json', params);
  }

  async redirects(domain: string) {
    return this.get('/redirect1/api.json', { LOOKUP: domain });
  }

  async recommendations(domain: string) {
    return this.get('/rec1/api.json', { LOOKUP: domain });
  }

  async tags(domain: string) {
    return this.get('/tag1/api.json', { LOOKUP: domain });
  }

  async productSearch(query: string) {
    return this.get('/productv1/api.json', { QUERY: query });
  }

  async freeLookup(domain: string) {
    return this.get('/free1/api.json', { LOOKUP: domain });
  }

  async changes(domain: string, since?: string) {
    return this.get('/change1/api.json', { LOOKUP: domain, SINCE: since });
  }

  async keywordSearch(keyword: string, limit?: number, offset?: string) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 16 || limit > 1000)) {
      throw createApiServiceError('limit must be a whole number from 16 to 1000.', {
        reason: 'builtwith_invalid_keyword_limit'
      });
    }
    return this.get('/kws1/api.json', { KEYWORD: keyword, LIMIT: limit, OFFSET: offset });
  }

  async financial(domain: string) {
    return this.get('/financial1/api.json', { LOOKUP: domain });
  }
}
