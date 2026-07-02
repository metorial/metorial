import { createAxios } from 'slates';

let BASE_URL = 'https://api.coinranking.com/v2';

export interface CoinrankingClientConfig {
  token: string;
  referenceCurrencyUuid?: string;
}

export interface ListCoinsParams {
  referenceCurrencyUuid?: string;
  timePeriod?: string;
  tiers?: string[];
  orderBy?: string;
  orderDirection?: string;
  limit?: number;
  offset?: number;
  tags?: string[];
  search?: string;
}

export interface GetCoinParams {
  coinUuid: string;
  referenceCurrencyUuid?: string;
  timePeriod?: string;
}

export interface GetCoinPriceParams {
  coinUuid: string;
  referenceCurrencyUuid?: string;
  timestamp?: number;
}

export interface GetCoinPriceHistoryParams {
  coinUuid: string;
  referenceCurrencyUuid?: string;
  timePeriod?: string;
}

export interface GetTrendingCoinsParams {
  referenceCurrencyUuid?: string;
  timePeriod?: string;
  tiers?: string[];
  limit?: number;
  offset?: number;
}

export interface ListReferenceCurrenciesParams {
  types?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  query: string;
  referenceCurrencyUuid?: string;
}

export interface GetGlobalStatsParams {
  referenceCurrencyUuid?: string;
}

export class CoinrankingClient {
  private axios: ReturnType<typeof createAxios>;
  private referenceCurrencyUuid?: string;

  constructor(config: CoinrankingClientConfig) {
    this.referenceCurrencyUuid = config.referenceCurrencyUuid;
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-access-token': config.token
      }
    });
  }

  private refCurrency(override?: string): string | undefined {
    return override || this.referenceCurrencyUuid;
  }

  async listCoins(params: ListCoinsParams = {}) {
    let query: Record<string, unknown> = {};
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;
    if (params.timePeriod) query.timePeriod = params.timePeriod;
    if (params.tiers && params.tiers.length > 0) query['tiers[]'] = params.tiers;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.orderDirection) query.orderDirection = params.orderDirection;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.tags && params.tags.length > 0) query['tags[]'] = params.tags;
    if (params.search) query.search = params.search;

    let response = await this.axios.get('/coins', { params: query });
    return response.data;
  }

  async getCoin(params: GetCoinParams) {
    let query: Record<string, unknown> = {};
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;
    if (params.timePeriod) query.timePeriod = params.timePeriod;

    let response = await this.axios.get(`/coin/${params.coinUuid}`, { params: query });
    return response.data;
  }

  async getCoinPrice(params: GetCoinPriceParams) {
    let query: Record<string, unknown> = {};
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;
    if (params.timestamp !== undefined) query.timestamp = params.timestamp;

    let response = await this.axios.get(`/coin/${params.coinUuid}/price`, { params: query });
    return response.data;
  }

  async getCoinPriceHistory(params: GetCoinPriceHistoryParams) {
    let query: Record<string, unknown> = {};
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;
    if (params.timePeriod) query.timePeriod = params.timePeriod;

    let response = await this.axios.get(`/coin/${params.coinUuid}/history`, { params: query });
    return response.data;
  }

  async getTrendingCoins(params: GetTrendingCoinsParams = {}) {
    let query: Record<string, unknown> = {};
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;
    if (params.timePeriod) query.timePeriod = params.timePeriod;
    if (params.tiers && params.tiers.length > 0) query['tiers[]'] = params.tiers;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.axios.get('/coins/trending', { params: query });
    return response.data;
  }

  async getGlobalStats(params: GetGlobalStatsParams = {}) {
    let query: Record<string, unknown> = {};
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;

    let response = await this.axios.get('/stats', { params: query });
    return response.data;
  }

  async listReferenceCurrencies(params: ListReferenceCurrenciesParams = {}) {
    let query: Record<string, unknown> = {};
    if (params.types && params.types.length > 0) query['types[]'] = params.types;
    if (params.search) query.search = params.search;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.axios.get('/reference-currencies', { params: query });
    return response.data;
  }

  async search(params: SearchParams) {
    let query: Record<string, unknown> = {
      query: params.query
    };
    let refCurrency = this.refCurrency(params.referenceCurrencyUuid);
    if (refCurrency) query.referenceCurrencyUuid = refCurrency;

    let response = await this.axios.get('/search-suggestions', { params: query });
    return response.data;
  }
}
