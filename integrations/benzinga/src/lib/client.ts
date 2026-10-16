import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Benzinga',
    reason: 'benzinga_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['text', 'message', 'detail', 'value', 'code'],
    nestedKeys: ['errors', 'error']
  });

export let validateInteger = (
  value: number | undefined,
  field: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${field} must be a whole number between ${min} and ${max}.`);
  }
};

export let validateSymbols = (value: string | undefined, field: string, max?: number) => {
  if (value === undefined) return;
  let values = value.split(',');
  if (values.some(item => !item.trim()) || (max !== undefined && values.length > max)) {
    throw createApiServiceError(
      `${field} must contain non-empty comma-separated identifiers${max === undefined ? '' : ` (maximum ${max})`}.`
    );
  }
};

export let numericValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

export let stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

export let recordsFrom = (
  data: unknown,
  keys: string[] = ['data'],
  singleton = false
): Record<string, any>[] => {
  if (Array.isArray(data)) return data;
  if (isApiErrorRecord(data)) {
    for (let key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
    if (singleton) return [data];
  }
  if (data === undefined || data === null || data === '') return [];
  throw createApiServiceError('Benzinga returned an unexpected response format.', {
    reason: 'benzinga_invalid_response'
  });
};

type CalendarParams = {
  page?: number;
  pageSize?: number;
  tickers?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  updated?: number;
  importance?: number;
  country?: string;
  securities?: string;
};

type FundamentalParams = {
  symbols: string;
  asOf?: string;
  period?: string;
  reportType?: string;
};

export class BenzingaClient {
  private axios = createAxios({
    baseURL: 'https://api.benzinga.com',
    headers: { accept: 'application/json' },
    timeout: 30000
  });

  constructor(private config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A Benzinga API key is required.');
  }

  private async get(
    path: string,
    params: Record<string, unknown> = {},
    headers?: Record<string, string>
  ) {
    try {
      let response = await this.axios.get(path, {
        params: { ...pickDefined(params), token: this.config.token },
        headers
      });
      if (isApiErrorRecord(response.data) && response.data.ok === false) {
        throw apiError({ response: { status: response.status, data: response.data } });
      }
      return response.data;
    } catch (error) {
      throw apiError(error);
    }
  }

  async getNews(params: {
    page?: number;
    pageSize?: number;
    displayOutput?: 'full' | 'abstract' | 'headline';
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    updatedSince?: number;
    publishedSince?: number;
    sort?: string;
    tickers?: string;
    channels?: string;
    topics?: string;
    authors?: string;
    contentTypes?: string;
    region?: string;
  }) {
    validateInteger(params.page, 'page', 0, 100000);
    validateInteger(params.pageSize, 'pageSize', 1, 100);
    validateInteger(params.updatedSince, 'updatedSince');
    validateInteger(params.publishedSince, 'publishedSince');
    validateSymbols(params.tickers, 'tickers', 50);
    let { contentTypes, ...rest } = params;
    return this.get('/api/v2/news', { ...rest, content_types: contentTypes });
  }

  async getNewsArticle(articleId: number, displayOutput?: 'full' | 'abstract' | 'headline') {
    validateInteger(articleId, 'articleId', 1);
    return this.get(`/api/v2/news/${articleId}`, { displayOutput });
  }

  async getNewsChannels() {
    return this.get('/api/v2.1/news/channels', {}, { Key: this.config.token });
  }

  async getWiims(params: {
    searchKeys?: string;
    updatedSince?: number;
    country?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.getNews({
      tickers: params.searchKeys,
      channels: 'WIIM',
      displayOutput: 'full',
      region: params.country,
      updatedSince: params.updatedSince,
      page: params.page,
      pageSize: params.pageSize
    });
  }

  private async getCalendar(type: string, params: CalendarParams) {
    validateInteger(params.page, 'page', 0, 100000);
    validateInteger(params.pageSize, 'pageSize', 1, 1000);
    validateInteger(params.importance, 'importance', 0, 5);
    validateInteger(params.updated, 'updated');
    validateSymbols(params.tickers, 'tickers', 50);
    validateSymbols(params.securities, 'tickers', 50);
    return this.get(`/api/v2.1/calendar/${type}`, {
      page: params.page,
      pagesize: params.pageSize,
      'parameters[tickers]':
        type === 'economics' || type === 'fda' ? undefined : params.tickers,
      'parameters[securities]': type === 'fda' ? params.securities : undefined,
      'parameters[date]': type === 'ipos' ? undefined : params.date,
      ipo_date: type === 'ipos' ? params.date : undefined,
      'parameters[date_from]': params.dateFrom,
      'parameters[date_to]': params.dateTo,
      'parameters[updated]': params.updated,
      'parameters[importance]': [
        'ratings',
        'earnings',
        'dividends',
        'economics',
        'guidance',
        'splits',
        'ma',
        'offerings'
      ].includes(type)
        ? params.importance
        : undefined,
      country: type === 'economics' ? params.country : undefined
    });
  }

  getCalendarRatings(params: CalendarParams) {
    return this.getCalendar('ratings', params);
  }
  getCalendarEarnings(params: CalendarParams) {
    return this.getCalendar('earnings', params);
  }
  getCalendarDividends(params: CalendarParams) {
    return this.getCalendar('dividends', params);
  }
  getCalendarEconomics(params: CalendarParams) {
    return this.getCalendar('economics', params);
  }
  getCalendarIPOs(params: CalendarParams) {
    return this.getCalendar('ipos', params);
  }
  getCalendarGuidance(params: CalendarParams) {
    return this.getCalendar('guidance', params);
  }
  getCalendarSplits(params: CalendarParams) {
    return this.getCalendar('splits', params);
  }
  getCalendarMA(params: CalendarParams) {
    return this.getCalendar('ma', params);
  }
  getCalendarOfferings(params: CalendarParams) {
    return this.getCalendar('offerings', params);
  }
  getCalendarFDA(params: CalendarParams) {
    return this.getCalendar('fda', params);
  }
  getCalendarConferenceCalls(params: CalendarParams) {
    return this.getCalendar('conference-calls', params);
  }

  async getMovers(params: {
    maxResults?: number;
    from?: string;
    to?: string;
    session?: 'REGULAR' | 'PRE_MARKET' | 'AFTER_MARKET';
    screenerQuery?: string;
    moversQuery?: string;
  }) {
    validateInteger(params.maxResults, 'maxResults', 1);
    return this.get('/api/v1/market/movers', params);
  }

  async getOptionActivity(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    validateInteger(params.page, 'page', 0, 100000);
    validateInteger(params.pageSize, 'pageSize', 1, 1000);
    validateInteger(params.updated, 'updated');
    validateSymbols(params.tickers, 'tickers', 50);
    return this.get('/api/v1/signal/option_activity', {
      page: params.page,
      pageSize: params.pageSize,
      'parameters[tickers]': params.tickers,
      'parameters[date_from]': params.dateFrom,
      'parameters[date_to]': params.dateTo,
      'parameters[date]': params.date,
      'parameters[updated]': params.updated
    });
  }

  async getDelayedQuotes(params: { symbols: string; isin?: string; cik?: string }) {
    validateSymbols(params.symbols, 'symbols');
    return this.get('/api/v2/quoteDelayed', params);
  }

  async getBars(params: {
    symbols: string;
    from?: string;
    to?: string;
    interval?: '1D' | '1H' | '5M' | '15M' | '30M' | '1W' | '1MONTH';
    session?: 'ANY' | 'REGULAR' | 'PRE_MARKET' | 'AFTER_MARKET';
  }) {
    validateSymbols(params.symbols, 'symbols');
    if (!params.from?.trim())
      throw createApiServiceError(
        'Provide from for historical bars, such as a YYYY-MM-DD date or 1DAY.'
      );
    let intervals = {
      '1D': '1d',
      '1H': '1h',
      '5M': '5m',
      '15M': '15m',
      '30M': '30m',
      '1W': '1w',
      '1MONTH': '1M'
    };
    return this.get('/api/v2/bars', {
      ...params,
      interval: params.interval ? intervals[params.interval] : undefined
    });
  }

  private getFundamental(path: string, params: FundamentalParams) {
    validateSymbols(params.symbols, 'symbols');
    return this.get(`/api/v2.1/fundamentals${path}`, params);
  }
  getFundamentals(params: FundamentalParams) {
    return this.getFundamental('', params);
  }
  getCompanyProfile(params: FundamentalParams) {
    return this.getFundamental('/companyProfile', params);
  }
  getFinancials(params: FundamentalParams) {
    return this.getFundamental('/financials', params);
  }
  getValuationRatios(params: FundamentalParams) {
    return this.getFundamental('/valuationRatios', params);
  }

  async searchLogos(params: {
    searchKeys: string;
    searchKeysType?: 'symbol' | 'cik' | 'cusip' | 'isin';
    fields?: string;
  }) {
    validateSymbols(params.searchKeys, 'searchKeys', 100);
    return this.get('/api/v2/logos/search', {
      search_keys: params.searchKeys,
      search_keys_type: params.searchKeysType ?? 'symbol',
      fields:
        params.fields ??
        'logo_light,logo_dark,logo_vector_light,logo_vector_dark,mark_light,mark_dark,colors'
    });
  }

  async getGovernmentTrades(params: {
    chamber?: 'House' | 'Senate';
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    searchKeys?: string;
    page?: number;
    pageSize?: number;
    updatedSince?: number;
  }) {
    validateInteger(params.page, 'page', 0, 100000);
    validateInteger(params.pageSize, 'pageSize', 1, 1000);
    validateInteger(params.updatedSince, 'updatedSince');
    validateSymbols(params.searchKeys, 'tickers');
    return this.get('/api/v1/gov/usa/congress/trades', {
      chamber: params.chamber,
      date: params.date,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      search_keys: params.searchKeys,
      search_keys_type: params.searchKeys ? 'ticker' : undefined,
      page: params.page,
      pagesize: params.pageSize,
      updated_since: params.updatedSince
    });
  }

  async getInsiderTransactions(params: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    searchKeys?: string;
    searchKeysType?: 'symbol' | 'accession_number' | 'id' | 'cik';
    page?: number;
    pageSize?: number;
    updatedSince?: number;
  }) {
    validateInteger(params.page, 'page', 0, 100000);
    validateInteger(params.pageSize, 'pageSize', 1, 1000);
    validateInteger(params.updatedSince, 'updatedSince');
    validateSymbols(params.searchKeys, 'tickers');
    return this.get('/api/v1/sec/insider_transactions/filings', {
      date: params.date,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      search_keys: params.searchKeys,
      search_keys_type: params.searchKeysType ?? 'symbol',
      page: params.page,
      pagesize: params.pageSize,
      updated_since: params.updatedSince
    });
  }

  async getShortInterest(params: {
    symbols: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
    finraReport?: boolean;
  }) {
    validateSymbols(params.symbols, 'symbols');
    validateInteger(params.page, 'page');
    validateInteger(params.pageSize, 'pageSize', 1);
    return this.get('/api/v1/shortinterest', params);
  }

  async getConsensusRatings(params: {
    ticker: string;
    dateFrom?: string;
    dateTo?: string;
    simplify?: boolean;
    aggregateType?: 'number' | 'percentage';
    pageSize?: number;
  }) {
    validateSymbols(params.ticker, 'ticker', 1);
    validateInteger(params.pageSize, 'pageSize', 1, 1000);
    return this.get('/api/v1/consensus-ratings', {
      'parameters[tickers]': params.ticker,
      'parameters[date_from]': params.dateFrom,
      'parameters[date_to]': params.dateTo,
      simplify: params.simplify,
      aggregate_type: params.aggregateType,
      pagesize: params.pageSize
    });
  }

  async getTrendingTickers(params: {
    timeframe?: '10m' | '1h' | '1d';
    source: 'all' | 'clickstream' | 'logo';
    tickers?: string;
    page?: number;
    pageSize?: number;
    dateFrom?: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
  }) {
    validateSymbols(params.tickers, 'tickers');
    validateInteger(params.page, 'page');
    validateInteger(params.pageSize, 'pageSize', 1, 1000);
    return this.get('/api/v1/trending-tickers/list', {
      timeframe: params.timeframe,
      interval: params.timeframe,
      source: params.source,
      tickers: params.tickers,
      page: params.page,
      pagesize: params.pageSize,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      time_from: params.timeFrom,
      time_to: params.timeTo
    });
  }
}
