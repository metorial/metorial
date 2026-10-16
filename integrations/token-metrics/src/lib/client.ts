import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

const CURRENT_API_BASE_URL = 'https://api.tokenmetrics.com/v3';

export type ProviderResponse = Record<string, unknown>;

// Preserve provider records without filling missing financial data or dropping null fields.
export let getRecords = (response: ProviderResponse): Record<string, any>[] => {
  if (!Array.isArray(response.data) || !response.data.every(isApiErrorRecord)) {
    throw createApiServiceError('Token Metrics returned an invalid data array.', {
      reason: 'invalid_provider_response'
    });
  }
  return response.data;
};

export interface TokenSearchParams {
  tokenId?: string;
  symbol?: string;
  tokenName?: string;
  slug?: string;
  category?: string;
  exchange?: string;
  blockchainAddress?: string;
  marketcap?: number;
  volume?: number;
  fdv?: number;
  limit?: number;
  page?: number;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export interface GradeParams extends DateRangeParams {
  tokenId?: string;
  symbol?: string;
  category?: string;
  exchange?: string;
  marketcap?: number;
  volume?: number;
  fdv?: number;
}

export interface TradingSignalParams extends GradeParams {
  signal?: number;
}

export interface IndicesParams {
  indicesType?: string;
  limit?: number;
  page?: number;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.tokenmetrics.com/v2',
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Token Metrics',
          reason: 'token_metrics_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        }),
      headers: {
        accept: 'application/json',
        'x-api-key': config.token
      }
    });
    this.axios.interceptors.response.use(response => {
      if (!isApiErrorRecord(response.data)) {
        throw createApiServiceError('Token Metrics returned an invalid response object.', {
          reason: 'invalid_provider_response'
        });
      }
      if (response.data.success === false) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Token Metrics',
            reason: 'token_metrics_api_error'
          }
        );
      }
      return response;
    });
  }

  async getTokens(params: TokenSearchParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/tokens', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        token_name: params.tokenName,
        category: params.category,
        exchange: params.exchange,
        blockchain_address: params.blockchainAddress,
        marketcap: params.marketcap,
        volume: params.volume,
        fdv: params.fdv,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getTopMarketCapTokens(topK: number): Promise<ProviderResponse> {
    let response = await this.axios.get('/top-market-cap-tokens', {
      params: { top_k: topK }
    });
    return response.data;
  }

  async getPrice(params: { tokenId?: string; symbol?: string }): Promise<ProviderResponse> {
    let response = await this.axios.get('/price', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol
      }
    });
    return response.data;
  }

  async getDailyOhlcv(params: {
    tokenId?: string;
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/daily-ohlcv', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getHourlyOhlcv(params: {
    tokenId?: string;
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/hourly-ohlcv', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getTraderGrades(params: GradeParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/trader-grades', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        start_date: params.startDate,
        end_date: params.endDate,
        category: params.category,
        exchange: params.exchange,
        marketcap: params.marketcap,
        volume: params.volume,
        fdv: params.fdv,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getInvestorGrades(params: GradeParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/investor-grades', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        start_date: params.startDate,
        end_date: params.endDate,
        category: params.category,
        exchange: params.exchange,
        marketcap: params.marketcap,
        volume: params.volume,
        fdv: params.fdv,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getTechnologyGrade(params: {
    tokenId?: string;
    symbol?: string;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/technology-grade', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol
      }
    });
    return response.data;
  }

  async getFundamentalGrade(params: {
    tokenId?: string;
    symbol?: string;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/fundamental-grade', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol
      }
    });
    return response.data;
  }

  async getTradingSignals(params: TradingSignalParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/trading-signals', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        start_date: params.startDate,
        end_date: params.endDate,
        category: params.category,
        exchange: params.exchange,
        marketcap: params.marketcap,
        volume: params.volume,
        fdv: params.fdv,
        signal: params.signal,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getHourlyTradingSignals(params: TradingSignalParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/hourly-trading-signals', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        startDate: params.startDate,
        endDate: params.endDate,
        category: params.category,
        exchange: params.exchange,
        marketcap: params.marketcap,
        volume: params.volume,
        fdv: params.fdv,
        signal: params.signal,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getMarketMetrics(params: DateRangeParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/market-metrics', {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getSentiments(params: { limit?: number; page?: number }): Promise<ProviderResponse> {
    let response = await this.axios.get('/sentiments', {
      params: {
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getResistanceSupport(params: {
    tokenId?: string;
    symbol?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/resistance-support', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getCorrelation(params: {
    tokenId?: string;
    symbol?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/correlation', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getQuantMetrics(params: GradeParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/quantmetrics', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        category: params.category,
        exchange: params.exchange,
        marketcap: params.marketcap,
        volume: params.volume,
        fdv: params.fdv,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getScenarioAnalysis(params: {
    tokenId?: string;
    symbol?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/scenario-analysis', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        limit: params.limit ?? 20,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getPricePrediction(params: {
    tokenId?: string;
    symbol?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/price-prediction', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getAiReports(params: {
    tokenId?: string;
    symbol?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/ai-reports', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getCryptoInvestors(params: {
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/crypto-investors', {
      params: {
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getIndices(params: IndicesParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/indices', {
      params: {
        indices_type: params.indicesType,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getIndicesHoldings(indexId: number): Promise<ProviderResponse> {
    let response = await this.axios.get('/indices-holdings', {
      params: { id: indexId }
    });
    return response.data;
  }

  async getIndicesPerformance(params: {
    indexId: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/indices-performance', {
      params: {
        id: params.indexId,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getTmGrades(params: TokenSearchParams): Promise<ProviderResponse> {
    let response = await this.axios.get('/tm-grade', {
      baseURL: CURRENT_API_BASE_URL,
      params: {
        token_id: params.tokenId,
        token_name: params.tokenName,
        symbol: params.symbol,
        slug: params.slug,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getGradeHistory(
    gradeType: 'tm' | 'technology' | 'fundamental',
    params: TokenSearchParams & DateRangeParams
  ): Promise<ProviderResponse> {
    let endpoints = {
      tm: '/tm-grade-history',
      technology: '/technology-grade-history',
      fundamental: '/fundamental-grade-history'
    } as const;
    let response = await this.axios.get(endpoints[gradeType], {
      baseURL: CURRENT_API_BASE_URL,
      params: {
        token_id: params.tokenId,
        token_name: params.tokenName,
        symbol: params.symbol,
        slug: params.slug,
        start_date: params.startDate,
        end_date: params.endDate,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getMoonshotTokens(params: {
    type?: 'active' | 'past';
    sortBy?: 'moonshot_at' | 'roi_pct' | 'tm_grade' | 'market_cap_usd';
    limit?: number;
    page?: number;
  }): Promise<ProviderResponse> {
    let response = await this.axios.get('/moonshot-tokens', {
      baseURL: CURRENT_API_BASE_URL,
      params: {
        type: params.type,
        sort_by: params.sortBy,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async askAiAgent(messages: Array<{ user: string }>): Promise<ProviderResponse> {
    let response = await this.axios.post(
      '/tmai',
      {
        messages
      },
      {
        headers: { 'content-type': 'application/json' }
      }
    );
    return response.data;
  }
}
