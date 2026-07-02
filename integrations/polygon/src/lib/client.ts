import { createAxios } from 'slates';

let BASE_URL = 'https://api.polygon.io';

export class PolygonClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ─── Stocks ───────────────────────────────────────────────

  async getAggregateBars(params: {
    ticker: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    adjusted?: boolean;
    sort?: string;
    limit?: number;
  }) {
    let { ticker, multiplier, timespan, from, to, ...query } = params;
    let response = await this.axios.get(
      `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${from}/${to}`,
      { params: query }
    );
    return response.data;
  }

  async getGroupedDailyBars(params: {
    date: string;
    adjusted?: boolean;
    includeOtc?: boolean;
  }) {
    let { date, ...query } = params;
    let response = await this.axios.get(`/v2/aggs/grouped/locale/us/market/stocks/${date}`, {
      params: { adjusted: query.adjusted, include_otc: query.includeOtc }
    });
    return response.data;
  }

  async getPreviousClose(params: { ticker: string; adjusted?: boolean }) {
    let { ticker, ...query } = params;
    let response = await this.axios.get(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev`, {
      params: query
    });
    return response.data;
  }

  async getTrades(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let { ticker, timestampGte, timestampLte, ...query } = params;
    let response = await this.axios.get(`/v3/trades/${encodeURIComponent(ticker)}`, {
      params: {
        ...query,
        'timestamp.gte': timestampGte,
        'timestamp.lte': timestampLte
      }
    });
    return response.data;
  }

  async getQuotes(params: {
    ticker: string;
    timestamp?: string;
    timestampGte?: string;
    timestampLte?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let { ticker, timestampGte, timestampLte, ...query } = params;
    let response = await this.axios.get(`/v3/quotes/${encodeURIComponent(ticker)}`, {
      params: {
        ...query,
        'timestamp.gte': timestampGte,
        'timestamp.lte': timestampLte
      }
    });
    return response.data;
  }

  async getLastTrade(ticker: string) {
    let response = await this.axios.get(`/v2/last/trade/${encodeURIComponent(ticker)}`);
    return response.data;
  }

  async getLastQuote(ticker: string) {
    let response = await this.axios.get(`/v2/last/nbbo/${encodeURIComponent(ticker)}`);
    return response.data;
  }

  // ─── Snapshots ────────────────────────────────────────────

  async getStockSnapshot(ticker: string) {
    let response = await this.axios.get(
      `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}`
    );
    return response.data;
  }

  async getAllStockSnapshots(params?: { tickers?: string; includeOtc?: boolean }) {
    let response = await this.axios.get(`/v2/snapshot/locale/us/markets/stocks/tickers`, {
      params: {
        tickers: params?.tickers,
        include_otc: params?.includeOtc
      }
    });
    return response.data;
  }

  async getStockMovers(direction: 'gainers' | 'losers') {
    let response = await this.axios.get(`/v2/snapshot/locale/us/markets/stocks/${direction}`);
    return response.data;
  }

  // ─── Unified Snapshots ────────────────────────────────────

  async getUnifiedSnapshot(params: { tickers: string }) {
    let response = await this.axios.get(`/v3/snapshot`, {
      params: { 'ticker.any_of': params.tickers }
    });
    return response.data;
  }

  // ─── Options ──────────────────────────────────────────────

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
    limit?: number;
    sort?: string;
  }) {
    let response = await this.axios.get(`/v3/reference/options/contracts`, {
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
        limit: params.limit,
        sort: params.sort
      }
    });
    return response.data;
  }

  async getOptionsChainSnapshot(params: {
    underlyingAsset: string;
    strikePrice?: number;
    strikePriceGte?: number;
    strikePriceLte?: number;
    expirationDate?: string;
    expirationDateGte?: string;
    expirationDateLte?: string;
    contractType?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let { underlyingAsset, ...rest } = params;
    let response = await this.axios.get(
      `/v3/snapshot/options/${encodeURIComponent(underlyingAsset)}`,
      {
        params: {
          strike_price: rest.strikePrice,
          'strike_price.gte': rest.strikePriceGte,
          'strike_price.lte': rest.strikePriceLte,
          expiration_date: rest.expirationDate,
          'expiration_date.gte': rest.expirationDateGte,
          'expiration_date.lte': rest.expirationDateLte,
          contract_type: rest.contractType,
          order: rest.order,
          limit: rest.limit,
          sort: rest.sort
        }
      }
    );
    return response.data;
  }

  // ─── Forex ────────────────────────────────────────────────

  async getForexSnapshot(ticker: string) {
    let response = await this.axios.get(
      `/v2/snapshot/locale/global/markets/forex/tickers/${encodeURIComponent(ticker)}`
    );
    return response.data;
  }

  async getAllForexSnapshots(params?: { tickers?: string }) {
    let response = await this.axios.get(`/v2/snapshot/locale/global/markets/forex/tickers`, {
      params: { tickers: params?.tickers }
    });
    return response.data;
  }

  async getForexConversion(params: {
    from: string;
    to: string;
    amount?: number;
    precision?: number;
  }) {
    let { from, to, ...query } = params;
    let response = await this.axios.get(
      `/v1/conversion/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
      { params: query }
    );
    return response.data;
  }

  async getForexLastQuote(from: string, to: string) {
    let response = await this.axios.get(
      `/v1/last_quote/currencies/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
    );
    return response.data;
  }

  async getForexMovers(direction: 'gainers' | 'losers') {
    let response = await this.axios.get(
      `/v2/snapshot/locale/global/markets/forex/${direction}`
    );
    return response.data;
  }

  // ─── Crypto ───────────────────────────────────────────────

  async getCryptoSnapshot(ticker: string) {
    let response = await this.axios.get(
      `/v2/snapshot/locale/global/markets/crypto/tickers/${encodeURIComponent(ticker)}`
    );
    return response.data;
  }

  async getAllCryptoSnapshots(params?: { tickers?: string }) {
    let response = await this.axios.get(`/v2/snapshot/locale/global/markets/crypto/tickers`, {
      params: { tickers: params?.tickers }
    });
    return response.data;
  }

  async getCryptoMovers(direction: 'gainers' | 'losers') {
    let response = await this.axios.get(
      `/v2/snapshot/locale/global/markets/crypto/${direction}`
    );
    return response.data;
  }

  // ─── Indices ──────────────────────────────────────────────

  async getIndicesSnapshot(params?: { tickers?: string }) {
    let response = await this.axios.get(`/v3/snapshot/indices`, {
      params: { 'ticker.any_of': params?.tickers }
    });
    return response.data;
  }

  // ─── Technical Indicators ─────────────────────────────────

  async getSMA(params: {
    ticker: string;
    timespan?: string;
    adjusted?: boolean;
    window?: number;
    seriesType?: string;
    order?: string;
    limit?: number;
    timestampGte?: string;
    timestampLte?: string;
  }) {
    let { ticker, timestampGte, timestampLte, seriesType, ...query } = params;
    let response = await this.axios.get(`/v1/indicators/sma/${encodeURIComponent(ticker)}`, {
      params: {
        ...query,
        series_type: seriesType,
        'timestamp.gte': timestampGte,
        'timestamp.lte': timestampLte
      }
    });
    return response.data;
  }

  async getEMA(params: {
    ticker: string;
    timespan?: string;
    adjusted?: boolean;
    window?: number;
    seriesType?: string;
    order?: string;
    limit?: number;
    timestampGte?: string;
    timestampLte?: string;
  }) {
    let { ticker, timestampGte, timestampLte, seriesType, ...query } = params;
    let response = await this.axios.get(`/v1/indicators/ema/${encodeURIComponent(ticker)}`, {
      params: {
        ...query,
        series_type: seriesType,
        'timestamp.gte': timestampGte,
        'timestamp.lte': timestampLte
      }
    });
    return response.data;
  }

  async getRSI(params: {
    ticker: string;
    timespan?: string;
    adjusted?: boolean;
    window?: number;
    seriesType?: string;
    order?: string;
    limit?: number;
    timestampGte?: string;
    timestampLte?: string;
  }) {
    let { ticker, timestampGte, timestampLte, seriesType, ...query } = params;
    let response = await this.axios.get(`/v1/indicators/rsi/${encodeURIComponent(ticker)}`, {
      params: {
        ...query,
        series_type: seriesType,
        'timestamp.gte': timestampGte,
        'timestamp.lte': timestampLte
      }
    });
    return response.data;
  }

  async getMACD(params: {
    ticker: string;
    timespan?: string;
    adjusted?: boolean;
    shortWindow?: number;
    longWindow?: number;
    signalWindow?: number;
    seriesType?: string;
    order?: string;
    limit?: number;
    timestampGte?: string;
    timestampLte?: string;
  }) {
    let {
      ticker,
      timestampGte,
      timestampLte,
      seriesType,
      shortWindow,
      longWindow,
      signalWindow,
      ...query
    } = params;
    let response = await this.axios.get(`/v1/indicators/macd/${encodeURIComponent(ticker)}`, {
      params: {
        ...query,
        series_type: seriesType,
        short_window: shortWindow,
        long_window: longWindow,
        signal_window: signalWindow,
        'timestamp.gte': timestampGte,
        'timestamp.lte': timestampLte
      }
    });
    return response.data;
  }

  // ─── Reference Data ───────────────────────────────────────

  async getTickers(params?: {
    ticker?: string;
    type?: string;
    market?: string;
    exchange?: string;
    active?: boolean;
    search?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let response = await this.axios.get(`/v3/reference/tickers`, { params });
    return response.data;
  }

  async getTickerDetails(params: { ticker: string; date?: string }) {
    let { ticker, ...query } = params;
    let response = await this.axios.get(
      `/v3/reference/tickers/${encodeURIComponent(ticker)}`,
      { params: query }
    );
    return response.data;
  }

  async getTickerEvents(params: { ticker: string; types?: string }) {
    let { ticker, ...query } = params;
    let response = await this.axios.get(
      `/vX/reference/tickers/${encodeURIComponent(ticker)}/events`,
      { params: query }
    );
    return response.data;
  }

  async getRelatedCompanies(ticker: string) {
    let response = await this.axios.get(`/v1/related-companies/${encodeURIComponent(ticker)}`);
    return response.data;
  }

  async getStockSplits(params?: {
    ticker?: string;
    executionDate?: string;
    executionDateGte?: string;
    executionDateLte?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let response = await this.axios.get(`/v3/reference/splits`, {
      params: {
        ticker: params?.ticker,
        execution_date: params?.executionDate,
        'execution_date.gte': params?.executionDateGte,
        'execution_date.lte': params?.executionDateLte,
        order: params?.order,
        limit: params?.limit,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async getDividends(params?: {
    ticker?: string;
    exDividendDate?: string;
    exDividendDateGte?: string;
    exDividendDateLte?: string;
    order?: string;
    limit?: number;
    sort?: string;
    type?: string;
    frequency?: number;
  }) {
    let response = await this.axios.get(`/v3/reference/dividends`, {
      params: {
        ticker: params?.ticker,
        ex_dividend_date: params?.exDividendDate,
        'ex_dividend_date.gte': params?.exDividendDateGte,
        'ex_dividend_date.lte': params?.exDividendDateLte,
        order: params?.order,
        limit: params?.limit,
        sort: params?.sort,
        type: params?.type,
        frequency: params?.frequency
      }
    });
    return response.data;
  }

  async getStockFinancials(params: {
    ticker: string;
    period?: string;
    timeframe?: string;
    order?: string;
    limit?: number;
    sort?: string;
    filingDateGte?: string;
    filingDateLte?: string;
  }) {
    let { ticker, filingDateGte, filingDateLte, ...query } = params;
    let response = await this.axios.get(`/vX/reference/financials`, {
      params: {
        ...query,
        ticker,
        'filing_date.gte': filingDateGte,
        'filing_date.lte': filingDateLte
      }
    });
    return response.data;
  }

  async getExchanges(params?: { assetClass?: string; locale?: string }) {
    let response = await this.axios.get(`/v3/reference/exchanges`, {
      params: {
        asset_class: params?.assetClass,
        locale: params?.locale
      }
    });
    return response.data;
  }

  async getMarketHolidays() {
    let response = await this.axios.get(`/v1/marketstatus/upcoming`);
    return response.data;
  }

  async getMarketStatus() {
    let response = await this.axios.get(`/v1/marketstatus/now`);
    return response.data;
  }

  async getConditions(params?: {
    assetClass?: string;
    dataType?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let response = await this.axios.get(`/v3/reference/conditions`, {
      params: {
        asset_class: params?.assetClass,
        data_type: params?.dataType,
        order: params?.order,
        limit: params?.limit,
        sort: params?.sort
      }
    });
    return response.data;
  }

  // ─── News ─────────────────────────────────────────────────

  async getNews(params?: {
    ticker?: string;
    publishedUtcGte?: string;
    publishedUtcLte?: string;
    order?: string;
    limit?: number;
    sort?: string;
  }) {
    let response = await this.axios.get(`/v2/reference/news`, {
      params: {
        ticker: params?.ticker,
        'published_utc.gte': params?.publishedUtcGte,
        'published_utc.lte': params?.publishedUtcLte,
        order: params?.order,
        limit: params?.limit,
        sort: params?.sort
      }
    });
    return response.data;
  }
}
