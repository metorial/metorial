import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';
import {
  coinDetailsResponseSchema,
  coinsResponseSchema,
  currenciesResponseSchema,
  historyResponseSchema,
  paginationSchema,
  parseCoinrankingResponse,
  priceResponseSchema,
  searchResponseSchema,
  statsResponseSchema,
  tagsResponseSchema,
  trendingResponseSchema
} from './schemas';

interface CoinrankingClientConfig {
  token: string;
  referenceCurrencyUuid?: string;
}

interface CurrencyParams {
  referenceCurrencyUuid?: string;
}
interface PageParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}
export interface ListCoinsParams extends CurrencyParams, PageParams {
  timePeriod?: string;
  tiers?: string[];
  orderBy?: string;
  orderDirection?: string;
  tags?: string[];
  search?: string;
  symbols?: string[];
  uuids?: string[];
  contractAddresses?: string[];
  blockchains?: string[];
}
export interface GetCoinParams extends CurrencyParams {
  coinUuid: string;
  timePeriod?: string;
}
export interface GetCoinPriceParams extends CurrencyParams {
  coinUuid: string;
  timestamp?: number;
}
export interface GetCoinPriceHistoryParams extends GetCoinParams {}
export interface GetTrendingCoinsParams extends CurrencyParams, PageParams {
  timePeriod?: string;
  tiers?: string[];
}
export interface ListReferenceCurrenciesParams extends PageParams {
  types?: string[];
  search?: string;
}
export interface SearchParams extends CurrencyParams {
  query: string;
  types?: string[];
}
export interface ListTagsParams extends CurrencyParams, PageParams {
  timePeriod?: string;
  type?: string;
}

type Query = Record<string, string | number | string[] | undefined>;

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Coinranking',
    reason: 'coinranking_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'type', 'code', 'detail'],
    nestedKeys: ['errors', 'error', 'data'],
    extractUpstreamCode: (_error, response, helpers) => {
      let body = response?.data;
      if (!helpers.isRecord(body)) return undefined;
      let nested = helpers.isRecord(body.error) ? body.error : body;
      let code = nested.type ?? nested.code ?? body.type ?? body.code;
      return typeof code === 'string' ? code : undefined;
    }
  });

export class CoinrankingClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private referenceCurrencyUuid?: string;

  constructor(config: CoinrankingClientConfig) {
    if (!config.token.trim()) throw createApiServiceError('Provide a Coinranking API key.');
    this.referenceCurrencyUuid = config.referenceCurrencyUuid;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.coinranking.com/v2',
      timeout: 30_000,
      authHeader: { name: 'x-access-token', value: config.token },
      errorAdapter: apiError
    });
  }

  private async get<T extends z.ZodType>(path: string, query: Query, schema: T) {
    let params = new URLSearchParams();
    for (let [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (let item of value) params.append(`${key}[]`, item);
      } else {
        params.set(key, String(value));
      }
    }
    let response = await this.axios.get<unknown>(path, { params });
    let body = response.data;
    if (isApiErrorRecord(body) && (body.status === 'fail' || body.status === 'error')) {
      throw apiError({ response: { data: body, status: response.status } });
    }
    if (!isApiErrorRecord(body) || body.status !== 'success') {
      throw createApiServiceError('Coinranking returned an invalid response envelope.', {
        reason: 'coinranking_invalid_response'
      });
    }
    return {
      data: parseCoinrankingResponse(schema, body.data),
      pagination:
        body.pagination === undefined
          ? undefined
          : parseCoinrankingResponse(paginationSchema, body.pagination)
    };
  }

  private currency(override?: string) {
    let value = override ?? this.referenceCurrencyUuid;
    if (value !== undefined && !value.trim()) {
      throw createApiServiceError(
        'referenceCurrencyUuid must not be blank. Call list_reference_currencies to discover currencies.'
      );
    }
    return value;
  }

  private coinPath(coinUuid: string) {
    if (!coinUuid.trim())
      throw createApiServiceError(
        'coinUuid must not be blank. Call search or list_coins to discover coins.'
      );
    return `/coin/${encodeURIComponent(coinUuid)}`;
  }

  private validatePage(params: PageParams, minLimit = 0) {
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < minLimit || params.limit > 5000)
    ) {
      throw createApiServiceError(
        `limit must be a whole number from ${minLimit} to 5000; free plans allow at most 100.`
      );
    }
    if (
      params.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('offset must be a nonnegative whole number.');
    }
    if (
      params.cursor !== undefined &&
      (!params.cursor.trim() || params.offset !== undefined)
    ) {
      throw createApiServiceError(
        'Provide a nonempty cursor without offset, or use offset pagination.'
      );
    }
  }

  async listCoins(params: ListCoinsParams = {}) {
    this.validatePage(params);
    if (params.offset !== undefined && params.offset > 5000)
      throw createApiServiceError(
        'Coinranking limits coin offset to 5000. Use cursor pagination for later pages.'
      );
    return this.get(
      '/coins',
      { ...params, referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid) },
      coinsResponseSchema
    );
  }

  async getCoin(params: GetCoinParams) {
    return this.get(
      this.coinPath(params.coinUuid),
      {
        referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid),
        timePeriod: params.timePeriod
      },
      coinDetailsResponseSchema
    );
  }

  async getCoinPrice(params: GetCoinPriceParams) {
    if (
      params.timestamp !== undefined &&
      (!Number.isFinite(params.timestamp) || params.timestamp < 0)
    )
      throw createApiServiceError('timestamp must be a nonnegative epoch time in seconds.');
    return this.get(
      `${this.coinPath(params.coinUuid)}/price`,
      {
        referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid),
        timestamp: params.timestamp
      },
      priceResponseSchema
    );
  }

  async getCoinPriceHistory(params: GetCoinPriceHistoryParams) {
    return this.get(
      `${this.coinPath(params.coinUuid)}/price-history`,
      {
        referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid),
        timePeriod: params.timePeriod
      },
      historyResponseSchema
    );
  }

  async getTrendingCoins(params: GetTrendingCoinsParams = {}) {
    this.validatePage(params, 1);
    return this.get(
      '/coins/trending',
      { ...params, referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid) },
      trendingResponseSchema
    );
  }

  async getGlobalStats(params: CurrencyParams = {}) {
    return this.get(
      '/stats',
      { referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid) },
      statsResponseSchema
    );
  }

  async listReferenceCurrencies(params: ListReferenceCurrenciesParams = {}) {
    this.validatePage(params);
    // The legacy asset filter predates commodities, indices, and stocks.
    let types = params.types?.flatMap(type =>
      type === 'asset' ? ['commodities', 'indices', 'stocks'] : [type]
    );
    return this.get('/reference-currencies', { ...params, types }, currenciesResponseSchema);
  }

  async search(params: SearchParams) {
    return this.get(
      '/search-suggestions',
      { ...params, referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid) },
      searchResponseSchema
    );
  }

  async listTags(params: ListTagsParams = {}) {
    this.validatePage(params, 1);
    return this.get(
      '/tags',
      { ...params, referenceCurrencyUuid: this.currency(params.referenceCurrencyUuid) },
      tagsResponseSchema
    );
  }
}
