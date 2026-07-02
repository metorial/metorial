import { createAxios } from 'slates';

export interface TokenSearchParams {
  tokenId?: string;
  symbol?: string;
  tokenName?: string;
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.tokenmetrics.com/v2',
      headers: {
        accept: 'application/json',
        'x-api-key': config.token
      }
    });
  }

  async getTokens(params: TokenSearchParams): Promise<any> {
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

  async getTopMarketCapTokens(topK: number): Promise<any> {
    let response = await this.axios.get('/top-market-cap-tokens', {
      params: { top_k: topK }
    });
    return response.data;
  }

  async getPrice(params: { tokenId?: string; symbol?: string }): Promise<any> {
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
  }): Promise<any> {
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
  }): Promise<any> {
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

  async getTraderGrades(params: GradeParams): Promise<any> {
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

  async getInvestorGrades(params: GradeParams): Promise<any> {
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

  async getTechnologyGrade(params: { tokenId?: string; symbol?: string }): Promise<any> {
    let response = await this.axios.get('/technology-grade', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol
      }
    });
    return response.data;
  }

  async getFundamentalGrade(params: { tokenId?: string; symbol?: string }): Promise<any> {
    let response = await this.axios.get('/fundamental-grade', {
      params: {
        token_id: params.tokenId,
        symbol: params.symbol
      }
    });
    return response.data;
  }

  async getTradingSignals(params: TradingSignalParams): Promise<any> {
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

  async getHourlyTradingSignals(params: TradingSignalParams): Promise<any> {
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

  async getMarketMetrics(params: DateRangeParams): Promise<any> {
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

  async getSentiments(params: { limit?: number; page?: number }): Promise<any> {
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
  }): Promise<any> {
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
  }): Promise<any> {
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

  async getQuantMetrics(params: GradeParams): Promise<any> {
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
  }): Promise<any> {
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
  }): Promise<any> {
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
  }): Promise<any> {
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

  async getCryptoInvestors(params: { limit?: number; page?: number }): Promise<any> {
    let response = await this.axios.get('/crypto-investors', {
      params: {
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getIndices(params: IndicesParams): Promise<any> {
    let response = await this.axios.get('/indices', {
      params: {
        indices_type: params.indicesType,
        limit: params.limit ?? 50,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getIndicesHoldings(indexId: number): Promise<any> {
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
  }): Promise<any> {
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

  async askAiAgent(messages: Array<{ user: string }>): Promise<any> {
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
