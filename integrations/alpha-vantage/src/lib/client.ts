import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxios
} from 'slates';

let http = createAxios({
  baseURL: 'https://www.alphavantage.co',
  timeout: 30000
});

export class Client {
  constructor(private token: string) {}

  private async query(
    params: Record<string, string | number | boolean | undefined>
  ): Promise<any> {
    let cleanParams: Record<string, string> = { apikey: this.token };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleanParams[key] = String(value);
      }
    }

    if (!this.token.trim()) {
      throw createApiServiceError('An Alpha Vantage API key is required.');
    }
    for (let [key, value] of Object.entries(cleanParams)) {
      if (!value.trim())
        throw createApiServiceError(`Alpha Vantage parameter ${key} cannot be empty.`);
    }
    let response = await requestAxios(
      String(params.function),
      () => http.get('/query', { params: cleanParams }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Alpha Vantage',
          reason: 'alpha_vantage_api_error',
          operation,
          detailKeys: ['Error Message', 'Information', 'Note', 'message', 'error'],
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    );
    let data = response.data;
    if (!isApiErrorRecord(data) || Object.keys(data).length === 0) {
      throw createApiServiceError(
        `Alpha Vantage returned no usable data for ${params.function}. Check the symbol and your API plan.`,
        {
          reason: 'alpha_vantage_invalid_response',
          upstreamStatus: response.status
        }
      );
    }
    for (let key of ['Error Message', 'Information', 'Note']) {
      if (key in data) {
        throw createApiServiceError(`Alpha Vantage: ${String(data[key])}`, {
          reason: 'alpha_vantage_api_error',
          upstreamStatus: response.status,
          upstreamCode: key
        });
      }
    }

    return data;
  }

  // ─── Time Series ───

  async timeSeriesIntraday(params: {
    symbol: string;
    interval: string;
    adjusted?: boolean;
    extendedHours?: boolean;
    month?: string;
    outputSize?: string;
    entitlement?: string;
  }) {
    return this.query({
      function: 'TIME_SERIES_INTRADAY',
      symbol: params.symbol,
      interval: params.interval,
      adjusted: params.adjusted,
      extended_hours: params.extendedHours,
      month: params.month,
      entitlement: params.entitlement,
      outputsize: params.outputSize
    });
  }

  async timeSeriesDaily(params: { symbol: string; outputSize?: string }) {
    return this.query({
      function: 'TIME_SERIES_DAILY',
      symbol: params.symbol,
      outputsize: params.outputSize
    });
  }

  async timeSeriesDailyAdjusted(params: {
    symbol: string;
    outputSize?: string;
    entitlement?: string;
  }) {
    return this.query({
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: params.symbol,
      entitlement: params.entitlement,
      outputsize: params.outputSize
    });
  }

  async timeSeriesWeekly(params: { symbol: string }) {
    return this.query({
      function: 'TIME_SERIES_WEEKLY',
      symbol: params.symbol
    });
  }

  async timeSeriesWeeklyAdjusted(params: { symbol: string }) {
    return this.query({
      function: 'TIME_SERIES_WEEKLY_ADJUSTED',
      symbol: params.symbol
    });
  }

  async timeSeriesMonthly(params: { symbol: string }) {
    return this.query({
      function: 'TIME_SERIES_MONTHLY',
      symbol: params.symbol
    });
  }

  async timeSeriesMonthlyAdjusted(params: { symbol: string }) {
    return this.query({
      function: 'TIME_SERIES_MONTHLY_ADJUSTED',
      symbol: params.symbol
    });
  }

  // ─── Quote & Search ───

  async globalQuote(params: { symbol: string; entitlement?: string }) {
    return this.query({
      function: 'GLOBAL_QUOTE',
      symbol: params.symbol,
      entitlement: params.entitlement
    });
  }

  async symbolSearch(params: { keywords: string }) {
    return this.query({
      function: 'SYMBOL_SEARCH',
      keywords: params.keywords
    });
  }

  async marketStatus() {
    return this.query({
      function: 'MARKET_STATUS'
    });
  }

  // ─── Fundamental Data ───

  async companyOverview(params: { symbol: string }) {
    return this.query({
      function: 'OVERVIEW',
      symbol: params.symbol
    });
  }

  async incomeStatement(params: { symbol: string }) {
    return this.query({
      function: 'INCOME_STATEMENT',
      symbol: params.symbol
    });
  }

  async balanceSheet(params: { symbol: string }) {
    return this.query({
      function: 'BALANCE_SHEET',
      symbol: params.symbol
    });
  }

  async cashFlow(params: { symbol: string }) {
    return this.query({
      function: 'CASH_FLOW',
      symbol: params.symbol
    });
  }

  async earnings(params: { symbol: string }) {
    return this.query({
      function: 'EARNINGS',
      symbol: params.symbol
    });
  }

  async dividends(params: { symbol: string }) {
    return this.query({
      function: 'DIVIDENDS',
      symbol: params.symbol
    });
  }

  async splits(params: { symbol: string }) {
    return this.query({
      function: 'SPLITS',
      symbol: params.symbol
    });
  }

  // ─── Options ───

  async realtimeOptions(params: {
    symbol: string;
    requireGreeks?: boolean;
    contract?: string;
    expiration?: string;
  }) {
    return this.query({
      function: 'REALTIME_OPTIONS',
      symbol: params.symbol,
      require_greeks: params.requireGreeks,
      contract: params.contract,
      expiration: params.expiration
    });
  }

  async historicalOptions(params: {
    symbol: string;
    date?: string;
    contract?: string;
    expiration?: string;
  }) {
    return this.query({
      function: 'HISTORICAL_OPTIONS',
      symbol: params.symbol,
      date: params.date,
      contract: params.contract,
      expiration: params.expiration
    });
  }

  // ─── News & Intelligence ───

  async newsSentiment(params: {
    tickers?: string;
    topics?: string;
    timeFrom?: string;
    timeTo?: string;
    sort?: string;
    limit?: number;
  }) {
    return this.query({
      function: 'NEWS_SENTIMENT',
      tickers: params.tickers,
      topics: params.topics,
      time_from: params.timeFrom,
      time_to: params.timeTo,
      sort: params.sort,
      limit: params.limit
    });
  }

  async topGainersLosers(params: { entitlement?: string } = {}) {
    return this.query({
      function: 'TOP_GAINERS_LOSERS',
      entitlement: params.entitlement
    });
  }

  async earningsCallTranscript(params: { symbol: string; quarter: string }) {
    return this.query({
      function: 'EARNINGS_CALL_TRANSCRIPT',
      symbol: params.symbol,
      quarter: params.quarter
    });
  }

  // ─── Forex ───

  async currencyExchangeRate(params: { fromCurrency: string; toCurrency: string }) {
    return this.query({
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: params.fromCurrency,
      to_currency: params.toCurrency
    });
  }

  async fxIntraday(params: {
    fromSymbol: string;
    toSymbol: string;
    interval: string;
    outputSize?: string;
  }) {
    return this.query({
      function: 'FX_INTRADAY',
      from_symbol: params.fromSymbol,
      to_symbol: params.toSymbol,
      interval: params.interval,
      outputsize: params.outputSize
    });
  }

  async fxDaily(params: { fromSymbol: string; toSymbol: string; outputSize?: string }) {
    return this.query({
      function: 'FX_DAILY',
      from_symbol: params.fromSymbol,
      to_symbol: params.toSymbol,
      outputsize: params.outputSize
    });
  }

  async fxWeekly(params: { fromSymbol: string; toSymbol: string }) {
    return this.query({
      function: 'FX_WEEKLY',
      from_symbol: params.fromSymbol,
      to_symbol: params.toSymbol
    });
  }

  async fxMonthly(params: { fromSymbol: string; toSymbol: string }) {
    return this.query({
      function: 'FX_MONTHLY',
      from_symbol: params.fromSymbol,
      to_symbol: params.toSymbol
    });
  }

  // ─── Crypto ───

  async cryptoDaily(params: { symbol: string; market: string }) {
    return this.query({
      function: 'DIGITAL_CURRENCY_DAILY',
      symbol: params.symbol,
      market: params.market
    });
  }

  async cryptoWeekly(params: { symbol: string; market: string }) {
    return this.query({
      function: 'DIGITAL_CURRENCY_WEEKLY',
      symbol: params.symbol,
      market: params.market
    });
  }

  async cryptoMonthly(params: { symbol: string; market: string }) {
    return this.query({
      function: 'DIGITAL_CURRENCY_MONTHLY',
      symbol: params.symbol,
      market: params.market
    });
  }

  // ─── Commodities ───

  async commodity(params: { commodityFunction: string; interval?: string }) {
    return this.query({
      function: params.commodityFunction,
      interval: params.interval
    });
  }

  // ─── Economic Indicators ───

  async economicIndicator(params: {
    indicatorFunction: string;
    interval?: string;
    maturity?: string;
  }) {
    return this.query({
      function: params.indicatorFunction,
      interval: params.interval,
      maturity: params.maturity
    });
  }

  // ─── Technical Indicators ───

  async technicalIndicator(params: {
    indicatorFunction: string;
    symbol: string;
    interval: string;
    timePeriod?: number;
    seriesType?: string;
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    fastKPeriod?: number;
    slowKPeriod?: number;
    slowDPeriod?: number;
    fastMaType?: number;
    slowMaType?: number;
    signalMaType?: number;
    nbdevup?: number;
    nbdevdn?: number;
    maType?: number;
    month?: string;
    entitlement?: string;
    slowKMaType?: number;
    slowDMaType?: number;
    fastDPeriod?: number;
    fastDMaType?: number;
    timePeriod1?: number;
    timePeriod2?: number;
    timePeriod3?: number;
    acceleration?: number;
    maximum?: number;
    fastLimit?: number;
    slowLimit?: number;
  }) {
    return this.query({
      function: params.indicatorFunction,
      symbol: params.symbol,
      interval: params.interval,
      time_period: params.timePeriod,
      series_type: params.seriesType,
      fastperiod: params.fastPeriod,
      slowperiod: params.slowPeriod,
      signalperiod: params.signalPeriod,
      fastkperiod: params.fastKPeriod,
      slowkperiod: params.slowKPeriod,
      slowdperiod: params.slowDPeriod,
      fastmatype: params.fastMaType,
      slowmatype: params.slowMaType,
      signalmatype: params.signalMaType,
      nbdevup: params.nbdevup,
      nbdevdn: params.nbdevdn,
      matype: params.maType,
      month: params.month,
      entitlement: params.entitlement,
      slowkmatype: params.slowKMaType,
      slowdmatype: params.slowDMaType,
      fastdperiod: params.fastDPeriod,
      fastdmatype: params.fastDMaType,
      timeperiod1: params.timePeriod1,
      timeperiod2: params.timePeriod2,
      timeperiod3: params.timePeriod3,
      acceleration: params.acceleration,
      maximum: params.maximum,
      fastlimit: params.fastLimit,
      slowlimit: params.slowLimit
    });
  }
  async etfProfile(params: { symbol: string }) {
    return this.query({ function: 'ETF_PROFILE', symbol: params.symbol });
  }

  async insiderTransactions(params: { symbol: string; from?: string }) {
    return this.query({
      function: 'INSIDER_TRANSACTIONS',
      symbol: params.symbol,
      from: params.from
    });
  }

  async earningsEstimates(params: { symbol: string }) {
    return this.query({ function: 'EARNINGS_ESTIMATES', symbol: params.symbol });
  }
}
