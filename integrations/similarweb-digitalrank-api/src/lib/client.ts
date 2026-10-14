import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let metaSchema = z.object({
  request: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
  last_updated: z.string().optional()
});

let globalRankSchema = z.object({
  meta: metaSchema.optional(),
  global_rank: z.array(z.object({ date: z.string(), global_rank: z.number() }))
});

let countryRankSchema = z.object({
  meta: metaSchema.optional(),
  country_rank: z.array(z.object({ date: z.string(), country_rank: z.number() }))
});

let categoryRankSchema = z.object({
  meta: metaSchema.optional(),
  category: z.string(),
  rank: z.number()
});

let topSitesSchema = z.object({
  meta: metaSchema.optional(),
  top_sites: z.array(z.object({ rank: z.number(), domain: z.string() }))
});

let capabilitiesSchema = z.object({ remaining_hits: z.number() }).passthrough();

export let normalizeDomain = (value: string) => {
  let domain = value.trim().toLowerCase();
  if (
    domain.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      domain
    ) ||
    domain.startsWith('www.')
  ) {
    throw createApiServiceError(
      'Provide a website domain without a protocol, path, or www. prefix, such as google.com.'
    );
  }
  return domain;
};

let rankQuery = (params: {
  startDate?: string;
  endDate?: string;
  mainDomainOnly?: boolean;
}) => {
  for (let [name, value] of [
    ['startDate', params.startDate],
    ['endDate', params.endDate]
  ]) {
    if (value !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw createApiServiceError(`${name} must be a valid month in YYYY-MM format.`);
    }
  }
  if (params.startDate && params.endDate && params.startDate > params.endDate) {
    throw createApiServiceError('startDate must not be later than endDate.');
  }
  return {
    start_date: params.startDate,
    end_date: params.endDate,
    main_domain_only:
      params.mainDomainOnly === undefined ? undefined : String(params.mainDomainOnly)
  };
};

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide an active Similarweb API key.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.similarweb.com',
      contentType: false,
      headers: { Accept: 'application/json' },
      params: { api_key: config.token.trim() }
    });
  }

  private async get<T>(
    path: string,
    schema: z.ZodType<T>,
    operation: string,
    params: Record<string, string | undefined> = {}
  ): Promise<T> {
    let data = await requestAxiosData<unknown>(
      operation,
      () => this.http.get(path, { params: { format: 'json', ...params } }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Similarweb',
          reason: 'similarweb_api_error',
          operation
        })
    );

    if (
      isApiErrorRecord(data) &&
      isApiErrorRecord(data.meta) &&
      typeof data.meta.status === 'string' &&
      data.meta.status.toLowerCase() !== 'success'
    ) {
      throw createApiServiceError(`Similarweb ${operation} failed: ${data.meta.status}.`, {
        reason: 'similarweb_api_error',
        upstreamCode: data.meta.status
      });
    }
    let parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw createApiServiceError(`Similarweb returned an unexpected ${operation} response.`, {
        reason: 'similarweb_invalid_response'
      });
    }
    return parsed.data;
  }

  async getGlobalRank(params: {
    domain: string;
    startDate?: string;
    endDate?: string;
    mainDomainOnly?: boolean;
  }) {
    let data = await this.get(
      `/v1/website/${encodeURIComponent(normalizeDomain(params.domain))}/global-rank/global-rank`,
      globalRankSchema,
      'global rank',
      rankQuery(params)
    );
    return {
      meta: { lastUpdated: data.meta?.last_updated },
      globalRank: data.global_rank.map(entry => ({
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
  }) {
    let country = params.country.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(country)) {
      throw createApiServiceError(
        'countryCode must be a 2-letter country code. Worldwide country rank is not supported.'
      );
    }
    let data = await this.get(
      `/v1/website/${encodeURIComponent(normalizeDomain(params.domain))}/country-rank/country-rank`,
      countryRankSchema,
      'country rank',
      { ...rankQuery(params), country }
    );
    return {
      meta: { lastUpdated: data.meta?.last_updated },
      countryRank: data.country_rank.map(entry => ({
        date: entry.date,
        countryRank: entry.country_rank
      }))
    };
  }

  async getCategoryRank(params: { domain: string }) {
    let data = await this.get(
      `/v1/website/${encodeURIComponent(normalizeDomain(params.domain))}/category-rank/category-rank`,
      categoryRankSchema,
      'industry rank'
    );
    return { category: data.category, rank: data.rank };
  }

  async getTopSites(params: { limit?: number }) {
    let limit = params.limit ?? 10;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5000) {
      throw createApiServiceError('limit must be a whole number between 1 and 5,000.');
    }
    let data = await this.get('/v1/similar-rank/top-sites/', topSitesSchema, 'top websites', {
      limit: String(limit)
    });
    return { topSites: data.top_sites };
  }

  async getCapabilities() {
    let data = await this.get('/capabilities', capabilitiesSchema, 'account capabilities');
    return { remainingHits: data.remaining_hits, capabilities: data };
  }
}
