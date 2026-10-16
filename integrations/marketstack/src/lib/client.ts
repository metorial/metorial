import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface PaginatedResponse<T> {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: T[];
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

type RecordValue = Record<string, unknown>;
type PageInput = { limit?: number; offset?: number };
type PriceInput = PageInput & {
  symbols: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  exchange?: string;
  interval?: string;
  afterHours?: boolean;
};

export let record = (value: unknown): RecordValue => (isApiErrorRecord(value) ? value : {});
export let rows = (value: unknown): RecordValue[] =>
  Array.isArray(value) ? value.filter(isApiErrorRecord) : [];
export let text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
let requiredText = (value: unknown): string => {
  if (typeof value !== 'string')
    throw createApiServiceError('Marketstack returned an invalid text field.');
  return value;
};
let requiredNullableText = (value: unknown): string | null =>
  value === null ? null : requiredText(value);
let requiredNumeric = (value: unknown): number | null => {
  let parsed = numeric(value);
  if (parsed === undefined)
    throw createApiServiceError('Marketstack returned an invalid numeric field.');
  return parsed;
};
let requiredBoolean = (value: unknown): boolean => {
  if (typeof value !== 'boolean')
    throw createApiServiceError('Marketstack returned an invalid boolean field.');
  return value;
};
let requiredNumber = (value: unknown): number => {
  let parsed = numeric(value);
  if (typeof parsed !== 'number')
    throw createApiServiceError('Marketstack returned an invalid numeric field.');
  return parsed;
};
let nullableText = (value: unknown) => (value === null ? null : text(value));
export let numeric = (value: unknown): number | null | undefined => {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    typeof value === 'string' &&
    /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(value.trim())
  ) {
    let parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};
let pagination = (value: unknown) => {
  let p = record(value);
  return {
    limit: typeof p.limit === 'number' ? p.limit : undefined,
    offset: typeof p.offset === 'number' ? p.offset : undefined,
    count: typeof p.count === 'number' ? p.count : undefined,
    total: typeof p.total === 'number' ? p.total : undefined
  };
};
let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Marketstack',
    reason: 'marketstack_api_error',
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    extractUpstreamCode: (_failure, response) => {
      let code = record(record(response?.data).error).code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    },
    detailKeys: ['message', 'info', 'code', 'type', 'details'],
    nestedKeys: ['error', 'errors', 'context', 'status']
  });
export let validatePage = (params: PageInput, maximum: number | null = 1000) => {
  if (
    params.limit !== undefined &&
    (!Number.isSafeInteger(params.limit) ||
      params.limit < 1 ||
      (maximum !== null && params.limit > maximum))
  ) {
    throw createApiServiceError(
      maximum === null
        ? 'limit must be a positive whole number.'
        : `limit must be a whole number between 1 and ${maximum}.`
    );
  }
  if (
    params.offset !== undefined &&
    (!Number.isSafeInteger(params.offset) || params.offset < 0)
  ) {
    throw createApiServiceError('offset must be a non-negative whole number.');
  }
};
export let validateDates = (from?: string, to?: string) => {
  for (let [field, value] of [
    ['dateFrom', from],
    ['dateTo', to]
  ] as const) {
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !==
          value.slice(0, 10))
    ) {
      throw createApiServiceError(
        `${field} must be a valid date in YYYY-MM-DD or ISO 8601 format.`
      );
    }
  }
  if (from && to && Date.parse(from) > Date.parse(to)) {
    throw createApiServiceError('dateFrom must be on or before dateTo.');
  }
};
let required = (value: string, field: string) => {
  if (!value.trim()) throw createApiServiceError(`${field} must not be empty.`);
  return value.trim();
};
let identifiers = (value: string, field: string) => {
  let values = value.split(',').map(v => v.trim());
  if (values.some(v => !v))
    throw createApiServiceError(
      `${field} must contain non-empty comma-separated identifiers.`
    );
  return values;
};
let cikCode = (value: string) => {
  if (!/^\d{1,10}$/.test(value))
    throw createApiServiceError('cik must contain 1 to 10 digits.');
  return value.padStart(10, '0');
};
let requiredPagination = (value: unknown) => {
  let p = record(value);
  let field = (key: string) => {
    if (typeof p[key] !== 'number')
      throw createApiServiceError('Marketstack returned invalid pagination.');
    return p[key];
  };
  return {
    limit: field('limit'),
    offset: field('offset'),
    count: field('count'),
    total: field('total')
  };
};
let mapPrice = (p: RecordValue) => ({
  symbol: requiredText(p.symbol),
  exchange: requiredText(p.exchange),
  date: requiredText(p.date),
  open: requiredNumeric(p.open),
  high: requiredNumeric(p.high),
  low: requiredNumeric(p.low),
  close: requiredNumeric(p.close),
  volume: requiredNumeric(p.volume),
  last: numeric(p.last),
  adj_open: numeric(p.adj_open),
  adj_high: numeric(p.adj_high),
  adj_low: numeric(p.adj_low),
  adj_close: numeric(p.adj_close),
  adj_volume: numeric(p.adj_volume),
  split_factor: numeric(p.split_factor),
  dividend: numeric(p.dividend)
});
let mapExchange = (value: unknown) => {
  let e = record(value);
  return {
    name: requiredText(e.name),
    acronym: requiredText(e.acronym),
    mic: requiredText(e.mic),
    country: text(e.country),
    country_code: requiredText(e.country_code),
    city: requiredText(e.city),
    website: requiredText(e.website),
    timezone: { timezone: text(record(e.timezone).timezone) },
    currency: { code: text(record(e.currency).code), name: text(record(e.currency).name) }
  };
};
let mapTicker = (t: RecordValue) => ({
  name: requiredText(t.name),
  symbol: requiredText(t.symbol ?? t.ticker),
  country: nullableText(t.country),
  has_intraday: typeof t.has_intraday === 'boolean' ? t.has_intraday : undefined,
  has_eod: typeof t.has_eod === 'boolean' ? t.has_eod : undefined,
  stock_exchange: mapExchange(t.stock_exchange)
});

let mapIndex = (i: RecordValue) => ({
  symbol: text(i.symbol),
  name: requiredText(i.benchmark),
  country: requiredText(i.country),
  price: requiredNumeric(i.price),
  change: requiredNumeric(i.price_change_day),
  change_percent: requiredNumeric(i.percentage_day),
  day_change_percent: requiredNumeric(i.percentage_day),
  week_change_percent: requiredNumeric(i.percentage_week),
  month_change_percent: requiredNumeric(i.percentage_month),
  year_change_percent: requiredNumeric(i.percentage_year),
  date: requiredText(i.date)
});

let mapBond = (b: RecordValue) => ({
  symbol: text(b.symbol),
  name: text(b.name),
  country: requiredText(b.country),
  yield: requiredNumeric(b.yield),
  change: requiredNumeric(b.price_change_day),
  change_percent: numeric(b.percentage_day),
  week_change_percent: requiredNumeric(b.percentage_week),
  month_change_percent: requiredNumeric(b.percentage_month),
  year_change_percent: requiredNumeric(b.percentage_year),
  date: requiredText(b.date)
});

export class Client {
  private accessKey: string;
  private axios = createAxios({ baseURL: 'https://api.marketstack.com/v2' });
  constructor(private params: { token: string }) {
    required(params.token, 'API key');
    this.accessKey = params.token;
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

  private async get(
    path: string,
    params: Record<string, unknown> = {},
    timeout = 30000
  ): Promise<unknown> {
    try {
      let response = await this.axios.get(path, {
        timeout,
        params: {
          access_key: this.params.token,
          ...Object.fromEntries(
            Object.entries(pickDefined(params)).filter(([, value]) => value !== '')
          )
        }
      });
      let body = record(response.data);
      let status = record(body.status);
      if (body.error || (typeof status.code === 'number' && status.code >= 400)) {
        throw apiError({
          response: {
            status: typeof status.code === 'number' ? status.code : response.status,
            data: response.data
          }
        });
      }
      return response.data;
    } catch (error) {
      throw apiError(error);
    }
  }
  private async page(path: string, params: Record<string, unknown> = {}, timeout = 30000) {
    let raw = await this.get(path, params, timeout);
    let body = record(raw);
    return { pagination: requiredPagination(body.pagination), data: rows(body.data), raw };
  }
  private priceParams(params: PriceInput) {
    validatePage(params);
    validateDates(params.dateFrom, params.dateTo);
    return {
      symbols: identifiers(params.symbols, 'symbols').join(','),
      date_from: params.dateFrom,
      date_to: params.dateTo,
      sort: params.sort,
      exchange: params.exchange,
      limit: params.limit,
      offset: params.offset,
      interval: params.interval,
      after_hours: params.afterHours
    };
  }
  async getEod(params: PriceInput) {
    let result = await this.page('/eod', this.priceParams(params));
    return {
      ...result,
      data: result.data.map(p => ({
        ...mapPrice(p),
        adj_open: requiredNumeric(p.adj_open),
        adj_high: requiredNumeric(p.adj_high),
        adj_low: requiredNumeric(p.adj_low),
        adj_close: requiredNumeric(p.adj_close),
        adj_volume: requiredNumeric(p.adj_volume),
        split_factor: requiredNumeric(p.split_factor),
        dividend: requiredNumeric(p.dividend)
      }))
    };
  }
  async getEodLatest(params: PriceInput) {
    let result = await this.page('/eod/latest', this.priceParams(params));
    return {
      ...result,
      data: result.data.map(p => ({
        ...mapPrice(p),
        adj_open: requiredNumeric(p.adj_open),
        adj_high: requiredNumeric(p.adj_high),
        adj_low: requiredNumeric(p.adj_low),
        adj_close: requiredNumeric(p.adj_close),
        adj_volume: requiredNumeric(p.adj_volume),
        split_factor: requiredNumeric(p.split_factor),
        dividend: requiredNumeric(p.dividend)
      }))
    };
  }
  async getIntraday(params: PriceInput) {
    let result = await this.page('/intraday', this.priceParams(params));
    return {
      ...result,
      data: result.data.map(p => ({ ...mapPrice(p), last: requiredNumeric(p.last) }))
    };
  }
  async getIntradayLatest(params: PriceInput) {
    let result = await this.page('/intraday/latest', this.priceParams(params));
    return {
      ...result,
      data: result.data.map(p => ({ ...mapPrice(p), last: requiredNumeric(p.last) }))
    };
  }
  async getTickers(params: PageInput & { search?: string; exchange?: string }) {
    validatePage(params);
    let result = await this.page('/tickerslist', params);
    return {
      ...result,
      data: result.data.map(t => ({
        ...mapTicker(t),
        has_intraday: requiredBoolean(t.has_intraday),
        has_eod: requiredBoolean(t.has_eod)
      }))
    };
  }
  async getTickerInfo(symbol: string) {
    let raw = await this.get(`/tickers/${encodeURIComponent(required(symbol, 'symbol'))}`);
    let body = record(raw);
    return { data: mapTicker(isApiErrorRecord(body.data) ? body.data : body), raw };
  }
  async getExchanges(params: PageInput & { search?: string }) {
    validatePage(params);
    let result = await this.page('/exchanges', params);
    return { ...result, data: result.data.map(mapExchange) };
  }
  async getSplits(params: PriceInput) {
    let result = await this.page('/splits', this.priceParams(params));
    return {
      ...result,
      data: result.data.map(p => ({
        symbol: requiredText(p.symbol),
        date: requiredText(p.date),
        split_factor: requiredNumber(p.split_factor)
      }))
    };
  }
  async getDividends(params: PriceInput) {
    let result = await this.page('/dividends', this.priceParams(params));
    return {
      ...result,
      data: result.data.map(p => ({
        symbol: requiredText(p.symbol),
        date: requiredText(p.date),
        dividend: requiredNumber(p.dividend)
      }))
    };
  }
  async getCommodities(
    params: PageInput & {
      symbols?: string;
      commodityName?: string;
      dateFrom?: string;
      dateTo?: string;
      sort?: string;
      frequency?: string;
    }
  ) {
    if (params.commodityName) {
      validatePage(params, null);
      validateDates(params.dateFrom, params.dateTo);
    }
    if (params.frequency && !params.commodityName)
      throw createApiServiceError('frequency requires commodityName.');
    if (params.commodityName && params.symbols)
      throw createApiServiceError(
        'Use commodityName for a named commodity or symbols for the legacy commodity-symbol request, without combining both.'
      );
    if (!params.commodityName) {
      let raw = await this.get(
        '/commodities',
        {
          symbols: params.symbols,
          date_from: params.dateFrom,
          date_to: params.dateTo,
          sort: params.sort,
          limit: params.limit,
          offset: params.offset
        },
        0
      );
      let body = record(raw);
      let result = { raw, data: rows(body.data), pagination: pagination(body.pagination) };
      return {
        ...result,
        data: result.data.map(c => ({
          symbol: text(c.symbol),
          name: requiredText(c.name ?? c.commodity_name),
          price: requiredNumeric(c.price === undefined ? c.commodity_price : c.price),
          day_high: numeric(c.day_high),
          day_low: numeric(c.day_low),
          change: numeric(c.change === undefined ? c.price_change_day : c.change),
          change_percent: numeric(
            c.change_percent === undefined ? c.percentage_day : c.change_percent
          ),
          date: requiredText(c.date ?? c.datetime)
        }))
      };
    }
    let historical = !!(params.dateFrom || params.dateTo || params.frequency);
    let raw = await this.get(historical ? '/commoditieshistory' : '/commodities', {
      commodity_name: required(params.commodityName, 'commodityName'),
      date_from: params.dateFrom,
      date_to: params.dateTo,
      frequency: params.frequency
    });
    let body = record(raw);
    let data: RecordValue[] = historical
      ? rows(record(body.result).data).flatMap(c =>
          rows(c.commodity_prices).map(p => ({ ...p, commodity_name: c.commodity_name }))
        )
      : rows(body.data);
    if (params.sort)
      data.sort(
        (a, b) =>
          String(a.date ?? a.datetime).localeCompare(String(b.date ?? b.datetime)) *
          (params.sort === 'ASC' ? 1 : -1)
      );
    return {
      pagination: pagination(body.pagination),
      raw,
      data: data
        .slice(
          params.offset ?? 0,
          params.limit === undefined ? undefined : (params.offset ?? 0) + params.limit
        )
        .map(c => ({
          symbol: text(c.symbol),
          name: requiredText(c.commodity_name),
          price: requiredNumeric(c.commodity_price),
          day_high: numeric(c.day_high),
          day_low: numeric(c.day_low),
          change: numeric(c.price_change_day),
          change_percent: numeric(c.percentage_day),
          date: requiredText(c.date ?? c.datetime)
        }))
    };
  }
  async getIndices(params: PageInput & { search?: string }) {
    validatePage(params);
    let result = await this.page('/indexlist', { limit: params.limit, offset: params.offset });
    let selected = result.data;
    let data: ReturnType<typeof mapIndex>[] = [];
    let details: unknown[] = [];
    for (let index of selected) {
      let raw = await this.get('/indexinfo', { index: index.benchmark });
      details.push(raw);
      for (let i of rows(Array.isArray(raw) ? raw : record(raw).data)) data.push(mapIndex(i));
    }
    let search = params.search?.toLowerCase();
    return {
      ...result,
      data: data.filter(
        i => !search || [i.name, i.country].some(v => v?.toLowerCase().includes(search))
      ),
      raw: { list: result.raw, details }
    };
  }
  async getBonds(params: PageInput & { search?: string }) {
    validatePage(params);
    let result = await this.page('/bondlist', { limit: params.limit, offset: params.offset });
    let selected = result.data.filter(
      b =>
        !params.search || String(b.country).toLowerCase().includes(params.search.toLowerCase())
    );
    let data: ReturnType<typeof mapBond>[] = [];
    let details: unknown[] = [];
    for (let bond of selected) {
      let raw = await this.get('/bond', { country: bond.country });
      details.push(raw);
      for (let b of rows(record(raw).data)) data.push(mapBond(b));
    }
    return { ...result, data, raw: { list: result.raw, details } };
  }
  async getEtfHoldings(
    params: PageInput & { symbol: string; dateFrom?: string; dateTo?: string }
  ) {
    validatePage(params);
    validateDates(params.dateFrom, params.dateTo);
    let raw = await this.get('/etfholdings', {
      ticker: required(params.symbol, 'symbol'),
      date_from: params.dateFrom,
      date_to: params.dateTo,
      limit: params.limit,
      offset: params.offset
    });
    let body = record(raw);
    let output = record(body.output);
    let attrs = record(output.attributes);
    return {
      pagination: pagination(body.pagination),
      raw,
      data: {
        fund: {
          symbol: requiredText(attrs.ticker),
          name: requiredText(record(body.basics).fund_name)
        },
        holdings: rows(output.holdings).map(h => {
          let s = record(h.investment_security);
          return {
            symbol: text(s.symbol),
            name: requiredText(s.name),
            balance: requiredNumeric(s.balance),
            value: requiredNumeric(s.value_usd),
            weight: requiredNumeric(s.percent_value),
            asset_category: requiredNullableText(s.asset_category),
            isin: requiredNullableText(s.isin),
            date: text(s.date)
          };
        })
      }
    };
  }
  async getCikLookup(params: { query: string }) {
    if (required(params.query, 'companyName').length < 3)
      throw createApiServiceError('companyName must contain at least 3 characters.');
    let result = await this.page('/cik_code', { company_name: params.query });
    return {
      ...result,
      data: result.data.map(c => ({
        cik: requiredText(c.cik_code),
        name: requiredText(c.company_name)
      }))
    };
  }
  async getSecSubmissions(
    params: PageInput & {
      cik: string;
      formType?: string;
      dateFrom?: string;
      dateTo?: string;
      accessionNumber?: string;
      reportFrom?: string;
      reportTo?: string;
    }
  ) {
    validatePage(params, null);
    validateDates(params.dateFrom, params.dateTo);
    validateDates(params.reportFrom, params.reportTo);
    let raw = await this.get('/submissions', {
      cik_code: cikCode(params.cik),
      filing_from: params.dateFrom,
      filing_to: params.dateTo,
      report_from: params.reportFrom,
      report_to: params.reportTo,
      accession_number: params.accessionNumber
    });
    let body = record(raw);
    let data = record(body.data);
    let recent = record(record(data.filings).recent);
    let accessions = Array.isArray(recent.accession_number) ? recent.accession_number : [];
    let values = accessions
      .map((accn, index) => {
        let at = (key: string) =>
          Array.isArray(recent[key]) ? recent[key][index] : undefined;
        return {
          accession_number: requiredText(accn),
          filing_date: requiredText(at('filing_date')),
          report_date: requiredNullableText(at('report_date')),
          form: requiredText(at('form')),
          primary_document: requiredNullableText(at('primary_document')),
          primary_document_description: requiredNullableText(at('primary_doc_description'))
        };
      })
      .filter(s => !params.formType || s.form === params.formType);
    return {
      pagination: pagination(body.pagination),
      raw,
      companyName: text(data.company_name),
      data: values.slice(
        params.offset ?? 0,
        params.limit === undefined ? undefined : (params.offset ?? 0) + params.limit
      )
    };
  }
  async getSecCompanyFacts(
    params: PageInput & { cik: string; taxonomy?: string; tag?: string }
  ) {
    validatePage(params);
    let raw = await this.get('/company_facts', {
      cik_code: cikCode(params.cik),
      limit: params.limit,
      offset: params.offset
    });
    let body = record(raw);
    let facts = record(record(body.data).facts);
    let data = Object.entries(facts).flatMap(([taxonomy, concepts]) =>
      Object.entries(record(concepts)).flatMap(([tag, value]) => {
        if (
          (params.taxonomy && taxonomy !== params.taxonomy) ||
          (params.tag && tag !== params.tag)
        )
          return [];
        let concept = record(value);
        return Object.entries(record(concept.units)).flatMap(([unit, values]) =>
          rows(values).map(v => ({
            taxonomy,
            tag,
            label: requiredText(concept.label),
            description: requiredNullableText(concept.description),
            unit,
            value: requiredNumeric(v.val),
            start: nullableText(v.start),
            end: requiredText(v.end),
            filed: requiredText(v.filed),
            form: requiredText(v.form),
            accession_number: requiredText(v.accn)
          }))
        );
      })
    );
    return { pagination: pagination(body.pagination), data, raw };
  }
  async getAccountsPayableFrames(
    params: PageInput & { taxonomy: string; tag: string; unit: string; period: string }
  ) {
    validatePage(params);
    if (params.taxonomy !== 'us-gaap' || params.tag !== 'AccountsPayableCurrent')
      throw createApiServiceError(
        'Marketstack frames support taxonomy us-gaap and tag AccountsPayableCurrent. Use company_facts for other company concepts.'
      );
    if (!/^CY\d{4}(?:Q[1-4]I?)?$/.test(params.period))
      throw createApiServiceError('period must be CYyyyy, CYyyyyQn, or CYyyyyQnI.');
    let raw = await this.get(
      `/frames/accounts_payable/${encodeURIComponent(required(params.unit, 'unit'))}`,
      { frame: params.period, limit: params.limit, offset: params.offset }
    );
    let body = record(raw);
    let data = record(body.data);
    return {
      pagination: pagination(body.pagination),
      raw,
      data: rows(data.frame_data).map(f => ({
        taxonomy: text(data.taxonomy),
        tag: text(data.tag),
        label: text(data.label),
        description: nullableText(data.description),
        unit: text(data.uom),
        value: numeric(f.val),
        start: nullableText(f.start),
        end: text(f.end),
        filed: text(f.filed),
        form: text(f.form),
        accession_number: text(f.accn),
        cik: f.cik,
        entityName: f.entityName
      }))
    };
  }
  async getSecFrames(
    params: PageInput & { taxonomy: string; tag: string; unit: string; period: string }
  ) {
    let result = await this.page(
      '/sec/frames',
      {
        taxonomy: params.taxonomy,
        tag: params.tag,
        unit: params.unit,
        period: params.period,
        limit: params.limit,
        offset: params.offset
      },
      0
    );
    return {
      ...result,
      data: result.data.map(f => ({
        taxonomy: requiredText(f.taxonomy),
        tag: requiredText(f.tag),
        label: requiredText(f.label),
        description: f.description === null ? null : requiredText(f.description),
        unit: requiredText(f.unit),
        value: requiredNumeric(f.value),
        start: nullableText(f.start),
        end: requiredText(f.end),
        filed: requiredText(f.filed),
        form: requiredText(f.form),
        accession_number: requiredText(f.accession_number)
      }))
    };
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

  async getCompanyRatings(params: {
    ticker: string;
    dateFrom?: string;
    dateTo?: string;
    rated?: 'buy' | 'sell' | 'hold';
  }) {
    let ticker = required(params.ticker, 'ticker');
    if (ticker.includes(','))
      throw createApiServiceError('ticker must contain exactly one ticker symbol.');
    validateDates(params.dateFrom, params.dateTo);
    return this.get('/companyratings', {
      ticker,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      rated: params.rated
    });
  }
  async getRealTimePrice(params: { symbol: string; exchange?: string }) {
    return this.get('/stockprice', {
      ticker: required(params.symbol, 'symbol'),
      exchange: params.exchange
    });
  }
  async getMarketIndex(index: string) {
    return this.get('/indexinfo', { index: required(index, 'index') });
  }
  async getCompanyProfile(symbol: string) {
    return this.get('/tickerinfo', { ticker: required(symbol, 'symbol') });
  }
  async getEtfs(
    params: PageInput & {
      ticker?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }
  ) {
    validatePage(params);
    validateDates(params.dateFrom, params.dateTo);
    return this.page('/etflist', {
      ticker: params.ticker,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      status: params.status,
      limit: params.limit,
      offset: params.offset
    });
  }
  async getCurrencies(params: PageInput) {
    validatePage(params);
    return this.page('/currencies', params);
  }
  async getTimezones(params: PageInput) {
    validatePage(params);
    return this.page('/timezones', params);
  }
}
