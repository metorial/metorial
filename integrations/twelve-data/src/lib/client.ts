import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.twelvedata.com'
});

export class TwelveDataClient {
  constructor(private token: string) {}

  private async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    let cleanParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    }

    let response = await http.get(path, {
      params: {
        ...cleanParams,
        apikey: this.token
      }
    });

    return response.data as T;
  }

  // Time Series
  async getTimeSeries(params: {
    symbol: string;
    interval: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    outputsize?: number;
    format?: string;
    delimiter?: string;
    prepost?: boolean;
    dp?: number;
    order?: string;
    timezone?: string;
    startDate?: string;
    endDate?: string;
    previousClose?: boolean;
  }) {
    return this.get('/time_series', {
      symbol: params.symbol,
      interval: params.interval,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      type: params.type,
      outputsize: params.outputsize,
      format: params.format || 'JSON',
      delimiter: params.delimiter,
      prepost: params.prepost,
      dp: params.dp,
      order: params.order,
      timezone: params.timezone,
      start_date: params.startDate,
      end_date: params.endDate,
      previous_close: params.previousClose
    });
  }

  // Real-Time Price
  async getPrice(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    dp?: number;
    prepost?: boolean;
  }) {
    return this.get('/price', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      type: params.type,
      dp: params.dp,
      prepost: params.prepost
    });
  }

  // Quote
  async getQuote(params: {
    symbol: string;
    interval?: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    dp?: number;
    prepost?: boolean;
    volume_time_period?: number;
  }) {
    return this.get('/quote', {
      symbol: params.symbol,
      interval: params.interval,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      type: params.type,
      dp: params.dp,
      prepost: params.prepost,
      volume_time_period: params.volume_time_period
    });
  }

  // End of Day Price
  async getEodPrice(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    dp?: number;
    prepost?: boolean;
  }) {
    return this.get('/eod', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      type: params.type,
      dp: params.dp,
      prepost: params.prepost
    });
  }

  // Exchange Rate
  async getExchangeRate(params: { symbol: string; dp?: number; timezone?: string }) {
    return this.get('/exchange_rate', {
      symbol: params.symbol,
      dp: params.dp,
      timezone: params.timezone
    });
  }

  // Currency Conversion
  async convertCurrency(params: {
    symbol: string;
    amount: number;
    dp?: number;
    timezone?: string;
  }) {
    return this.get('/currency_conversion', {
      symbol: params.symbol,
      amount: params.amount,
      dp: params.dp,
      timezone: params.timezone
    });
  }

  // Symbol Search
  async searchSymbols(params: { symbol: string; outputsize?: number; show_plan?: boolean }) {
    return this.get('/symbol_search', {
      symbol: params.symbol,
      outputsize: params.outputsize,
      show_plan: params.show_plan
    });
  }

  // Company Profile
  async getProfile(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/profile', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // Dividends
  async getDividends(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/dividends', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      range: params.range,
      start_date: params.startDate,
      end_date: params.endDate
    });
  }

  // Splits
  async getSplits(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/splits', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      range: params.range,
      start_date: params.startDate,
      end_date: params.endDate
    });
  }

  // Earnings
  async getEarnings(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    period?: string;
    outputsize?: number;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/earnings', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      type: params.type,
      period: params.period,
      outputsize: params.outputsize,
      start_date: params.startDate,
      end_date: params.endDate
    });
  }

  // Income Statement
  async getIncomeStatement(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/income_statement', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      period: params.period,
      start_date: params.startDate,
      end_date: params.endDate
    });
  }

  // Balance Sheet
  async getBalanceSheet(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/balance_sheet', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      period: params.period,
      start_date: params.startDate,
      end_date: params.endDate
    });
  }

  // Cash Flow
  async getCashFlow(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/cash_flow', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country,
      period: params.period,
      start_date: params.startDate,
      end_date: params.endDate
    });
  }

  // Logo
  async getLogo(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/logo', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // Price Target
  async getPriceTarget(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/price_target', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // Revenue Estimates
  async getRevenueEstimates(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/revenue_estimate', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // ETF Holdings
  async getEtfHoldings(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/etf/holdings', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // ETF Profile
  async getEtfProfile(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/etf/profile', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // Mutual Fund Holdings
  async getMutualFundHoldings(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/mutual_fund/holdings', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // Mutual Fund Profile
  async getMutualFundProfile(params: {
    symbol: string;
    exchange?: string;
    micCode?: string;
    country?: string;
  }) {
    return this.get('/mutual_fund/profile', {
      symbol: params.symbol,
      exchange: params.exchange,
      mic_code: params.micCode,
      country: params.country
    });
  }

  // Technical Indicator
  async getTechnicalIndicator(params: {
    symbol: string;
    interval: string;
    indicator: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    outputsize?: number;
    timezone?: string;
    startDate?: string;
    endDate?: string;
    dp?: number;
    order?: string;
    timePeriod?: number;
    seriesType?: string;
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    fastKPeriod?: number;
    slowKPeriod?: number;
    slowDPeriod?: number;
    maType?: string;
    sdType?: string;
    sd?: number;
  }) {
    let { indicator, ...rest } = params;
    return this.get(`/${indicator}`, {
      symbol: rest.symbol,
      interval: rest.interval,
      exchange: rest.exchange,
      mic_code: rest.micCode,
      country: rest.country,
      type: rest.type,
      outputsize: rest.outputsize,
      timezone: rest.timezone,
      start_date: rest.startDate,
      end_date: rest.endDate,
      dp: rest.dp,
      order: rest.order,
      time_period: rest.timePeriod,
      series_type: rest.seriesType,
      fast_period: rest.fastPeriod,
      slow_period: rest.slowPeriod,
      signal_period: rest.signalPeriod,
      fast_k_period: rest.fastKPeriod,
      slow_k_period: rest.slowKPeriod,
      slow_d_period: rest.slowDPeriod,
      ma_type: rest.maType,
      sd_type: rest.sdType,
      sd: rest.sd
    });
  }

  // Exchanges List
  async getExchanges(params?: {
    type?: string;
    name?: string;
    code?: string;
    country?: string;
  }) {
    return this.get('/exchanges', params || {});
  }

  // Instrument Types
  async getInstrumentTypes() {
    return this.get('/instrument_type');
  }

  // Stocks List
  async getStocksList(params?: {
    symbol?: string;
    exchange?: string;
    micCode?: string;
    country?: string;
    type?: string;
    show_plan?: boolean;
  }) {
    return this.get('/stocks', params || {});
  }

  // Earnings Calendar
  async getEarningsCalendar(params?: { dp?: number; startDate?: string; endDate?: string }) {
    return this.get('/earnings_calendar', {
      dp: params?.dp,
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }
}
