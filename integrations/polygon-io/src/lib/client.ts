import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.polygon.io',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // --- Reference Data ---

  async searchTickers(params: {
    search?: string;
    ticker?: string;
    type?: string;
    market?: string;
    exchange?: string;
    active?: boolean;
    order?: string;
    sort?: string;
    limit?: number;
    cursor?: string;
  }) {
    let res = await this.http.get('/v3/reference/tickers', { params });
    return res.data;
  }

  async getTickerDetails(ticker: string, params?: { date?: string }) {
    let res = await this.http.get(`/v3/reference/tickers/${ticker}`, { params });
    return res.data;
  }

  async getTickerTypes(params?: { assetClass?: string; locale?: string }) {
    let res = await this.http.get('/v3/reference/tickers/types', {
      params: {
        asset_class: params?.assetClass,
        locale: params?.locale
      }
    });
    return res.data;
  }

  async getExchanges(params?: { assetClass?: string; locale?: string }) {
    let res = await this.http.get('/v3/reference/exchanges', {
      params: {
        asset_class: params?.assetClass,
        locale: params?.locale
      }
    });
    return res.data;
  }

  async getMarketStatus() {
    let res = await this.http.get('/v1/marketstatus/now');
    return res.data;
  }

  async getMarketHolidays() {
    let res = await this.http.get('/v1/marketstatus/upcoming');
    return res.data;
  }

  async getConditions(params?: {
    assetClass?: string;
    dataType?: string;
    sip?: string;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get('/v3/reference/conditions', {
      params: {
        asset_class: params?.assetClass,
        data_type: params?.dataType,
        sip: params?.sip,
        order: params?.order,
        sort: params?.sort,
        limit: params?.limit
      }
    });
    return res.data;
  }

  // --- Stock Financials ---

  async getStockFinancials(params: {
    ticker?: string;
    cik?: string;
    companyName?: string;
    sic?: string;
    filingDate?: string;
    filingDateLte?: string;
    filingDateGte?: string;
    periodOfReportDate?: string;
    periodOfReportDateLte?: string;
    periodOfReportDateGte?: string;
    timeframe?: string;
    includeSources?: boolean;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get('/vX/reference/financials', {
      params: {
        ticker: params.ticker,
        cik: params.cik,
        company_name: params.companyName,
        sic: params.sic,
        filing_date: params.filingDate,
        'filing_date.lte': params.filingDateLte,
        'filing_date.gte': params.filingDateGte,
        period_of_report_date: params.periodOfReportDate,
        'period_of_report_date.lte': params.periodOfReportDateLte,
        'period_of_report_date.gte': params.periodOfReportDateGte,
        timeframe: params.timeframe,
        include_sources: params.includeSources,
        order: params.order,
        sort: params.sort,
        limit: params.limit
      }
    });
    return res.data;
  }

  // --- Dividends ---

  async getDividends(params?: {
    ticker?: string;
    exDividendDate?: string;
    exDividendDateGte?: string;
    exDividendDateLte?: string;
    recordDate?: string;
    declarationDate?: string;
    payDate?: string;
    frequency?: number;
    dividendType?: string;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get('/v3/reference/dividends', {
      params: {
        ticker: params?.ticker,
        ex_dividend_date: params?.exDividendDate,
        'ex_dividend_date.gte': params?.exDividendDateGte,
        'ex_dividend_date.lte': params?.exDividendDateLte,
        record_date: params?.recordDate,
        declaration_date: params?.declarationDate,
        pay_date: params?.payDate,
        frequency: params?.frequency,
        dividend_type: params?.dividendType,
        order: params?.order,
        sort: params?.sort,
        limit: params?.limit
      }
    });
    return res.data;
  }

  // --- Stock Splits ---

  async getStockSplits(params?: {
    ticker?: string;
    executionDate?: string;
    executionDateGte?: string;
    executionDateLte?: string;
    reverseStock?: boolean;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get('/v3/reference/splits', {
      params: {
        ticker: params?.ticker,
        execution_date: params?.executionDate,
        'execution_date.gte': params?.executionDateGte,
        'execution_date.lte': params?.executionDateLte,
        reverse_split: params?.reverseStock,
        order: params?.order,
        sort: params?.sort,
        limit: params?.limit
      }
    });
    return res.data;
  }

  // --- Market Data: Aggregates ---

  async getAggregates(params: {
    ticker: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    adjusted?: boolean;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get(
      `/v2/aggs/ticker/${params.ticker}/range/${params.multiplier}/${params.timespan}/${params.from}/${params.to}`,
      {
        params: {
          adjusted: params.adjusted,
          sort: params.sort,
          limit: params.limit
        }
      }
    );
    return res.data;
  }

  // --- Market Data: Grouped Daily ---

  async getGroupedDailyBars(params: {
    date: string;
    adjusted?: boolean;
    includeOtc?: boolean;
  }) {
    let res = await this.http.get(`/v2/aggs/grouped/locale/us/market/stocks/${params.date}`, {
      params: {
        adjusted: params.adjusted,
        include_otc: params.includeOtc
      }
    });
    return res.data;
  }

  // --- Market Data: Daily Open/Close ---

  async getDailyOpenClose(params: { ticker: string; date: string; adjusted?: boolean }) {
    let res = await this.http.get(`/v1/open-close/${params.ticker}/${params.date}`, {
      params: { adjusted: params.adjusted }
    });
    return res.data;
  }

  // --- Market Data: Previous Close ---

  async getPreviousClose(params: { ticker: string; adjusted?: boolean }) {
    let res = await this.http.get(`/v2/aggs/ticker/${params.ticker}/prev`, {
      params: { adjusted: params.adjusted }
    });
    return res.data;
  }

  // --- Market Data: Trades ---

  async getTrades(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get(`/v3/trades/${params.ticker}`, {
      params: {
        timestamp: params.timestamp,
        'timestamp.gte': params.timestampGte,
        'timestamp.lte': params.timestampLte,
        order: params.order,
        sort: params.sort,
        limit: params.limit
      }
    });
    return res.data;
  }

  // --- Market Data: Quotes (NBBO) ---

  async getQuotes(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get(`/v3/quotes/${params.ticker}`, {
      params: {
        timestamp: params.timestamp,
        'timestamp.gte': params.timestampGte,
        'timestamp.lte': params.timestampLte,
        order: params.order,
        sort: params.sort,
        limit: params.limit
      }
    });
    return res.data;
  }

  // --- Snapshots ---

  async getAllTickersSnapshot(params?: { tickers?: string[]; includeOtc?: boolean }) {
    let res = await this.http.get('/v2/snapshot/locale/us/markets/stocks/tickers', {
      params: {
        tickers: params?.tickers?.join(','),
        include_otc: params?.includeOtc
      }
    });
    return res.data;
  }

  async getTickerSnapshot(ticker: string) {
    let res = await this.http.get(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
    return res.data;
  }

  async getGainersLosers(direction: 'gainers' | 'losers', params?: { includeOtc?: boolean }) {
    let res = await this.http.get(`/v2/snapshot/locale/us/markets/stocks/${direction}`, {
      params: { include_otc: params?.includeOtc }
    });
    return res.data;
  }

  async getOptionContractSnapshot(underlyingAsset: string, optionContract: string) {
    let res = await this.http.get(`/v3/snapshot/options/${underlyingAsset}/${optionContract}`);
    return res.data;
  }

  async getCryptoSnapshot(ticker: string) {
    let res = await this.http.get(
      `/v2/snapshot/locale/global/markets/crypto/tickers/${ticker}`
    );
    return res.data;
  }

  async getAllCryptoSnapshot() {
    let res = await this.http.get('/v2/snapshot/locale/global/markets/crypto/tickers');
    return res.data;
  }

  async getForexSnapshot(ticker: string) {
    let res = await this.http.get(
      `/v2/snapshot/locale/global/markets/forex/tickers/${ticker}`
    );
    return res.data;
  }

  async getAllForexSnapshot() {
    let res = await this.http.get('/v2/snapshot/locale/global/markets/forex/tickers');
    return res.data;
  }

  async getIndicesSnapshot(params?: { tickerAnyOf?: string[] }) {
    let res = await this.http.get('/v3/snapshot/indices', {
      params: {
        'ticker.any_of': params?.tickerAnyOf?.join(',')
      }
    });
    return res.data;
  }

  async getUniversalSnapshot(params?: {
    tickerAnyOf?: string[];
    type?: string;
    limit?: number;
    order?: string;
    sort?: string;
  }) {
    let res = await this.http.get('/v3/snapshot', {
      params: {
        'ticker.any_of': params?.tickerAnyOf?.join(','),
        type: params?.type,
        limit: params?.limit,
        order: params?.order,
        sort: params?.sort
      }
    });
    return res.data;
  }

  // --- Options ---

  async getOptionsContracts(params: {
    underlyingTicker?: string;
    contractType?: string;
    expirationDate?: string;
    expirationDateGte?: string;
    expirationDateLte?: string;
    strikePrice?: number;
    strikePriceGte?: number;
    strikePriceLte?: number;
    expired?: boolean;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get('/v3/reference/options/contracts', {
      params: {
        underlying_ticker: params.underlyingTicker,
        contract_type: params.contractType,
        expiration_date: params.expirationDate,
        'expiration_date.gte': params.expirationDateGte,
        'expiration_date.lte': params.expirationDateLte,
        strike_price: params.strikePrice,
        'strike_price.gte': params.strikePriceGte,
        'strike_price.lte': params.strikePriceLte,
        expired: params.expired,
        order: params.order,
        sort: params.sort,
        limit: params.limit
      }
    });
    return res.data;
  }

  async getOptionsChainSnapshot(
    underlyingAsset: string,
    params?: {
      contractType?: string;
      expirationDate?: string;
      expirationDateGte?: string;
      expirationDateLte?: string;
      strikePrice?: number;
      strikePriceGte?: number;
      strikePriceLte?: number;
      order?: string;
      sort?: string;
      limit?: number;
    }
  ) {
    let res = await this.http.get(`/v3/snapshot/options/${underlyingAsset}`, {
      params: {
        contract_type: params?.contractType,
        expiration_date: params?.expirationDate,
        'expiration_date.gte': params?.expirationDateGte,
        'expiration_date.lte': params?.expirationDateLte,
        strike_price: params?.strikePrice,
        'strike_price.gte': params?.strikePriceGte,
        'strike_price.lte': params?.strikePriceLte,
        order: params?.order,
        sort: params?.sort,
        limit: params?.limit
      }
    });
    return res.data;
  }

  // --- Technical Indicators ---

  async getSMA(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    timespan?: string;
    adjusted?: boolean;
    window?: number;
    seriesType?: string;
    order?: string;
    sort?: string;
    limit?: number;
    expandUnderlying?: boolean;
  }) {
    let res = await this.http.get(`/v1/indicators/sma/${params.ticker}`, {
      params: {
        timestamp: params.timestamp,
        'timestamp.gte': params.timestampGte,
        'timestamp.lte': params.timestampLte,
        timespan: params.timespan,
        adjusted: params.adjusted,
        window: params.window,
        series_type: params.seriesType,
        order: params.order,
        sort: params.sort,
        limit: params.limit,
        expand_underlying: params.expandUnderlying
      }
    });
    return res.data;
  }

  async getEMA(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    timespan?: string;
    adjusted?: boolean;
    window?: number;
    seriesType?: string;
    order?: string;
    sort?: string;
    limit?: number;
    expandUnderlying?: boolean;
  }) {
    let res = await this.http.get(`/v1/indicators/ema/${params.ticker}`, {
      params: {
        timestamp: params.timestamp,
        'timestamp.gte': params.timestampGte,
        'timestamp.lte': params.timestampLte,
        timespan: params.timespan,
        adjusted: params.adjusted,
        window: params.window,
        series_type: params.seriesType,
        order: params.order,
        sort: params.sort,
        limit: params.limit,
        expand_underlying: params.expandUnderlying
      }
    });
    return res.data;
  }

  async getMACD(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    timespan?: string;
    adjusted?: boolean;
    shortWindow?: number;
    longWindow?: number;
    signalWindow?: number;
    seriesType?: string;
    order?: string;
    sort?: string;
    limit?: number;
    expandUnderlying?: boolean;
  }) {
    let res = await this.http.get(`/v1/indicators/macd/${params.ticker}`, {
      params: {
        timestamp: params.timestamp,
        'timestamp.gte': params.timestampGte,
        'timestamp.lte': params.timestampLte,
        timespan: params.timespan,
        adjusted: params.adjusted,
        short_window: params.shortWindow,
        long_window: params.longWindow,
        signal_window: params.signalWindow,
        series_type: params.seriesType,
        order: params.order,
        sort: params.sort,
        limit: params.limit,
        expand_underlying: params.expandUnderlying
      }
    });
    return res.data;
  }

  async getRSI(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    timespan?: string;
    adjusted?: boolean;
    window?: number;
    seriesType?: string;
    order?: string;
    sort?: string;
    limit?: number;
    expandUnderlying?: boolean;
  }) {
    let res = await this.http.get(`/v1/indicators/rsi/${params.ticker}`, {
      params: {
        timestamp: params.timestamp,
        'timestamp.gte': params.timestampGte,
        'timestamp.lte': params.timestampLte,
        timespan: params.timespan,
        adjusted: params.adjusted,
        window: params.window,
        series_type: params.seriesType,
        order: params.order,
        sort: params.sort,
        limit: params.limit,
        expand_underlying: params.expandUnderlying
      }
    });
    return res.data;
  }

  // --- News ---

  async getTickerNews(params?: {
    ticker?: string;
    publishedUtcGte?: string;
    publishedUtcLte?: string;
    order?: string;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get('/v2/reference/news', {
      params: {
        ticker: params?.ticker,
        'published_utc.gte': params?.publishedUtcGte,
        'published_utc.lte': params?.publishedUtcLte,
        order: params?.order,
        sort: params?.sort,
        limit: params?.limit
      }
    });
    return res.data;
  }

  // --- Forex ---

  async getForexAggregates(params: {
    ticker: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    adjusted?: boolean;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get(
      `/v2/aggs/ticker/${params.ticker}/range/${params.multiplier}/${params.timespan}/${params.from}/${params.to}`,
      {
        params: {
          adjusted: params.adjusted,
          sort: params.sort,
          limit: params.limit
        }
      }
    );
    return res.data;
  }

  async getForexPreviousClose(ticker: string, params?: { adjusted?: boolean }) {
    let res = await this.http.get(`/v2/aggs/ticker/${ticker}/prev`, {
      params: { adjusted: params?.adjusted }
    });
    return res.data;
  }

  // --- Crypto ---

  async getCryptoAggregates(params: {
    ticker: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    adjusted?: boolean;
    sort?: string;
    limit?: number;
  }) {
    let res = await this.http.get(
      `/v2/aggs/ticker/${params.ticker}/range/${params.multiplier}/${params.timespan}/${params.from}/${params.to}`,
      {
        params: {
          adjusted: params.adjusted,
          sort: params.sort,
          limit: params.limit
        }
      }
    );
    return res.data;
  }

  async getCryptoPreviousClose(ticker: string, params?: { adjusted?: boolean }) {
    let res = await this.http.get(`/v2/aggs/ticker/${ticker}/prev`, {
      params: { adjusted: params?.adjusted }
    });
    return res.data;
  }
}
