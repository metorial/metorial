import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: T[];
}

export interface EodPrice {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  adj_high: number | null;
  adj_low: number | null;
  adj_close: number | null;
  adj_open: number | null;
  adj_volume: number | null;
  split_factor: number | null;
  dividend: number | null;
  symbol: string;
  exchange: string;
  date: string;
}

export interface IntradayPrice {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  last: number | null;
  volume: number | null;
  symbol: string;
  exchange: string;
  date: string;
}

export interface TickerInfo {
  name: string;
  symbol: string;
  has_intraday: boolean;
  has_eod: boolean;
  country: string | null;
  stock_exchange: {
    name: string;
    acronym: string;
    mic: string;
    country: string;
    country_code: string;
    city: string;
    website: string;
  };
}

export interface ExchangeInfo {
  name: string;
  acronym: string;
  mic: string;
  country: string;
  country_code: string;
  city: string;
  website: string;
  timezone: {
    timezone: string;
    abbr: string;
    abbr_dst: string;
  };
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
}

export interface SplitInfo {
  date: string;
  split_factor: number;
  symbol: string;
}

export interface DividendInfo {
  date: string;
  dividend: number;
  symbol: string;
}

export interface CommodityPrice {
  symbol: string;
  name: string;
  price: number | null;
  day_high: number | null;
  day_low: number | null;
  change: number | null;
  change_percent: number | null;
  date: string;
}

export interface IndexData {
  symbol: string;
  name: string;
  country: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  day_change_percent: number | null;
  week_change_percent: number | null;
  month_change_percent: number | null;
  year_change_percent: number | null;
  date: string;
}

export interface BondData {
  symbol: string;
  name: string;
  country: string;
  yield: number | null;
  change: number | null;
  change_percent: number | null;
  week_change_percent: number | null;
  month_change_percent: number | null;
  year_change_percent: number | null;
  date: string;
}

export interface EtfHolding {
  symbol: string;
  name: string;
  balance: number | null;
  value: number | null;
  weight: number | null;
  asset_category: string | null;
  isin: string | null;
  date: string;
}

export interface EtfHoldingsResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: {
    fund: {
      symbol: string;
      name: string;
    };
    holdings: EtfHolding[];
  };
}

export interface CikLookupResult {
  cik: string;
  name: string;
  ticker: string | null;
}

export interface SecSubmission {
  accession_number: string;
  filing_date: string;
  report_date: string | null;
  form: string;
  primary_document: string | null;
  primary_document_description: string | null;
}

export interface SecFact {
  taxonomy: string;
  tag: string;
  label: string;
  description: string | null;
  unit: string;
  value: number | null;
  start: string | null;
  end: string;
  filed: string;
  form: string;
  accession_number: string;
}

export interface AnalystRating {
  symbol: string;
  date: string;
  analyst: string | null;
  rating: string | null;
  price_target: number | null;
  consensus_buy: number | null;
  consensus_sell: number | null;
  consensus_hold: number | null;
}

export interface RealTimePrice {
  symbol: string;
  exchange: string;
  price: number | null;
  currency: string | null;
  last_trade_at: string | null;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private accessKey: string;

  constructor(params: { token: string }) {
    this.accessKey = params.token;
    this.axios = createAxios({
      baseURL: 'https://api.marketstack.com/v2'
    });
  }

  private buildParams(
    params: Record<string, string | number | boolean | undefined | null>
  ): Record<string, string | number | boolean> {
    let result: Record<string, string | number | boolean> = {
      access_key: this.accessKey
    };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }

  async getEod(params: {
    symbols: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    exchange?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<EodPrice>> {
    let response = await this.axios.get('/eod', {
      params: this.buildParams({
        symbols: params.symbols,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        sort: params.sort,
        exchange: params.exchange,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getEodLatest(params: {
    symbols: string;
    exchange?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<EodPrice>> {
    let response = await this.axios.get('/eod/latest', {
      params: this.buildParams({
        symbols: params.symbols,
        exchange: params.exchange,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getEodForDate(params: {
    date: string;
    symbols?: string;
    exchange?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<EodPrice>> {
    let response = await this.axios.get(`/eod/${params.date}`, {
      params: this.buildParams({
        symbols: params.symbols,
        exchange: params.exchange,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getIntraday(params: {
    symbols: string;
    dateFrom?: string;
    dateTo?: string;
    interval?: string;
    sort?: string;
    exchange?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<IntradayPrice>> {
    let response = await this.axios.get('/intraday', {
      params: this.buildParams({
        symbols: params.symbols,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        interval: params.interval,
        sort: params.sort,
        exchange: params.exchange,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getIntradayLatest(params: {
    symbols: string;
    exchange?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<IntradayPrice>> {
    let response = await this.axios.get('/intraday/latest', {
      params: this.buildParams({
        symbols: params.symbols,
        exchange: params.exchange,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getRealTimePrice(params: {
    symbols: string;
  }): Promise<PaginatedResponse<RealTimePrice>> {
    let response = await this.axios.get('/intraday/latest', {
      params: this.buildParams({
        symbols: params.symbols
      })
    });
    return response.data;
  }

  async getTickers(params: {
    search?: string;
    exchange?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<TickerInfo>> {
    let response = await this.axios.get('/tickers', {
      params: this.buildParams({
        search: params.search,
        exchange: params.exchange,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getTickerInfo(symbol: string): Promise<{ data: TickerInfo }> {
    let response = await this.axios.get(`/tickers/${symbol}`, {
      params: this.buildParams({})
    });
    return response.data;
  }

  async getExchanges(params: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<ExchangeInfo>> {
    let response = await this.axios.get('/exchanges', {
      params: this.buildParams({
        search: params.search,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getExchangeInfo(mic: string): Promise<{ data: ExchangeInfo }> {
    let response = await this.axios.get(`/exchanges/${mic}`, {
      params: this.buildParams({})
    });
    return response.data;
  }

  async getSplits(params: {
    symbols: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<SplitInfo>> {
    let response = await this.axios.get('/splits', {
      params: this.buildParams({
        symbols: params.symbols,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        sort: params.sort,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getDividends(params: {
    symbols: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<DividendInfo>> {
    let response = await this.axios.get('/dividends', {
      params: this.buildParams({
        symbols: params.symbols,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        sort: params.sort,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getCommodities(params: {
    symbols?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CommodityPrice>> {
    let response = await this.axios.get('/commodities', {
      params: this.buildParams({
        symbols: params.symbols,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        sort: params.sort,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getIndices(params: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<IndexData>> {
    let response = await this.axios.get('/indices', {
      params: this.buildParams({
        search: params.search,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getBonds(params: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<BondData>> {
    let response = await this.axios.get('/bonds', {
      params: this.buildParams({
        search: params.search,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getEtfHoldings(params: {
    symbol: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<EtfHoldingsResponse> {
    let response = await this.axios.get(`/etf/${params.symbol}/holdings`, {
      params: this.buildParams({
        date_from: params.dateFrom,
        date_to: params.dateTo,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getCikLookup(params: { query: string }): Promise<PaginatedResponse<CikLookupResult>> {
    let response = await this.axios.get('/sec/cik', {
      params: this.buildParams({
        query: params.query
      })
    });
    return response.data;
  }

  async getSecSubmissions(params: {
    cik: string;
    formType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<SecSubmission>> {
    let response = await this.axios.get(`/sec/${params.cik}/submissions`, {
      params: this.buildParams({
        form_type: params.formType,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getSecCompanyFacts(params: {
    cik: string;
    taxonomy?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<SecFact>> {
    let response = await this.axios.get(`/sec/${params.cik}/facts`, {
      params: this.buildParams({
        taxonomy: params.taxonomy,
        tag: params.tag,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getSecFrames(params: {
    taxonomy: string;
    tag: string;
    unit: string;
    period: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<SecFact>> {
    let response = await this.axios.get('/sec/frames', {
      params: this.buildParams({
        taxonomy: params.taxonomy,
        tag: params.tag,
        unit: params.unit,
        period: params.period,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getAnalystRatings(params: {
    symbols: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<AnalystRating>> {
    let response = await this.axios.get('/analysts', {
      params: this.buildParams({
        symbols: params.symbols,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getCurrencies(params: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<{ code: string; symbol: string; name: string }>> {
    let response = await this.axios.get('/currencies', {
      params: this.buildParams({
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }

  async getTimezones(params: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<{ timezone: string; abbr: string; abbr_dst: string }>> {
    let response = await this.axios.get('/timezones', {
      params: this.buildParams({
        limit: params.limit,
        offset: params.offset
      })
    });
    return response.data;
  }
}
