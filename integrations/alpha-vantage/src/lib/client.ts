import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://www.alphavantage.co'
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

    let response = await http.get('/query', { params: cleanParams });
    let data = response.data;

    if (data && typeof data === 'object' && 'Error Message' in data) {
      throw new Error(data['Error Message']);
    }
    if (data && typeof data === 'object' && 'Information' in data) {
      throw new Error(data.Information);
    }
    if (data && typeof data === 'object' && 'Note' in data) {
      throw new Error(data.Note);
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
  }) {
    return this.query({
      function: 'TIME_SERIES_INTRADAY',
      symbol: params.symbol,
      interval: params.interval,
      adjusted: params.adjusted,
      extended_hours: params.extendedHours,
      month: params.month,
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

  async timeSeriesDailyAdjusted(params: { symbol: string; outputSize?: string }) {
    return this.query({
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: params.symbol,
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

  async globalQuote(params: { symbol: string }) {
    return this.query({
      function: 'GLOBAL_QUOTE',
      symbol: params.symbol
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
  }) {
    return this.query({
      function: 'REALTIME_OPTIONS',
      symbol: params.symbol,
      require_greeks: params.requireGreeks,
      contract: params.contract
    });
  }

  async historicalOptions(params: { symbol: string; date?: string }) {
    return this.query({
      function: 'HISTORICAL_OPTIONS',
      symbol: params.symbol,
      date: params.date
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

  async topGainersLosers() {
    return this.query({
      function: 'TOP_GAINERS_LOSERS'
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
      matype: params.maType
    });
  }
}
