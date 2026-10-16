import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let eodhdArray = (data: unknown, operation: string, field?: string) => {
  let records = field && isApiErrorRecord(data) ? data[field] : data;
  if (!Array.isArray(records)) {
    throw createApiServiceError(`EODHD returned an unexpected response for ${operation}.`, {
      reason: 'invalid_response'
    });
  }
  return records;
};

export class EodhdClient {
  private token: string;
  private http;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://eodhd.com/api',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'EODHD',
          reason: 'api_request_failed',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
    this.http.interceptors.response.use(response => {
      let data = response.data;
      if (
        isApiErrorRecord(data) &&
        (data.error || (typeof data.status === 'number' && data.status >= 400))
      ) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'EODHD',
            reason: 'api_request_failed',
            extractStatus: () =>
              typeof data.status === 'number' ? data.status : response.status
          }
        );
      }
      if (typeof data === 'string' && /^\s*(?:<!doctype\s+html|<html)\b/i.test(data)) {
        throw createApiServiceError('EODHD returned an HTML page instead of financial data.', {
          reason: 'invalid_response'
        });
      }
      return response;
    });
  }

  private params(extra: Record<string, unknown> = {}) {
    return { api_token: this.token, fmt: 'json', ...extra };
  }

  // ─── Historical End-of-Day ─────────────────────────────────────────

  async getEndOfDayPrices(
    symbol: string,
    options?: {
      from?: string;
      to?: string;
      period?: string;
      order?: string;
    }
  ) {
    let response = await this.http.get(`/eod/${encodeURIComponent(symbol)}`, {
      params: this.params({
        from: options?.from,
        to: options?.to,
        period: options?.period,
        order: options?.order
      })
    });
    return response.data;
  }

  // ─── Intraday Data ─────────────────────────────────────────────────

  async getIntradayPrices(
    symbol: string,
    options?: {
      interval?: string;
      from?: number;
      to?: number;
    }
  ) {
    let response = await this.http.get(`/intraday/${encodeURIComponent(symbol)}`, {
      params: this.params({
        interval: options?.interval ?? '5m',
        from: options?.from,
        to: options?.to
      })
    });
    return response.data;
  }

  // ─── Live / Real-Time Prices ───────────────────────────────────────

  async getLivePrices(symbol: string, additionalSymbols?: string[]) {
    let response = await this.http.get(`/real-time/${encodeURIComponent(symbol)}`, {
      params: this.params({
        s: additionalSymbols?.join(',')
      })
    });
    return response.data;
  }

  // ─── Fundamental Data ──────────────────────────────────────────────

  async getFundamentals(
    symbol: string,
    options?: {
      filter?: string;
    }
  ) {
    let response = await this.http.get(`/fundamentals/${encodeURIComponent(symbol)}`, {
      params: this.params({
        filter: options?.filter
      })
    });
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────────────

  async searchInstruments(
    query: string,
    options?: {
      limit?: number;
      type?: string;
      exchange?: string;
      bondsOnly?: number;
    }
  ) {
    let response = await this.http.get(`/search/${encodeURIComponent(query)}`, {
      params: this.params({
        limit: options?.limit,
        type: options?.type,
        exchange: options?.exchange,
        bonds_only: options?.bondsOnly
      })
    });
    return response.data;
  }

  // ─── Financial News ────────────────────────────────────────────────

  async getNews(options?: {
    symbol?: string;
    tag?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/news', {
      params: this.params({
        s: options?.symbol,
        t: options?.tag,
        from: options?.from,
        to: options?.to,
        limit: options?.limit,
        offset: options?.offset
      })
    });
    return response.data;
  }

  // ─── Sentiment ─────────────────────────────────────────────────────

  async getSentiment(
    symbols: string,
    options?: {
      from?: string;
      to?: string;
    }
  ) {
    let response = await this.http.get('/sentiments', {
      params: this.params({
        s: symbols,
        from: options?.from,
        to: options?.to
      })
    });
    return response.data;
  }

  // ─── Stock Screener ────────────────────────────────────────────────

  async screenStocks(options?: {
    filters?: string;
    signals?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/screener', {
      params: this.params({
        filters: options?.filters,
        signals: options?.signals,
        sort: options?.sort,
        limit: options?.limit,
        offset: options?.offset
      })
    });
    return response.data;
  }

  // ─── Technical Indicators ──────────────────────────────────────────

  async getTechnicalIndicator(
    symbol: string,
    options: {
      function: string;
      period?: number;
      from?: string;
      to?: string;
      order?: string;
      splitAdjustedOnly?: number;
    }
  ) {
    let response = await this.http.get(`/technical/${encodeURIComponent(symbol)}`, {
      params: this.params({
        function: options.function,
        period: options.period,
        from: options.from,
        to: options.to,
        order: options.order,
        splitadjusted_only: options.splitAdjustedOnly
      })
    });
    return response.data;
  }

  // ─── Calendar ──────────────────────────────────────────────────────

  async getEarningsCalendar(options?: { from?: string; to?: string; symbols?: string }) {
    let response = await this.http.get('/calendar/earnings', {
      params: this.params({
        from: options?.from,
        to: options?.to,
        symbols: options?.symbols
      })
    });
    return response.data;
  }

  async getIpoCalendar(options?: { from?: string; to?: string }) {
    let response = await this.http.get('/calendar/ipos', {
      params: this.params({
        from: options?.from,
        to: options?.to
      })
    });
    return response.data;
  }

  async getSplitsCalendar(options?: { from?: string; to?: string; symbols?: string }) {
    let response = await this.http.get('/calendar/splits', {
      params: this.params({
        from: options?.from,
        to: options?.to,
        symbols: options?.symbols
      })
    });
    return response.data;
  }

  // ─── Dividends & Splits ────────────────────────────────────────────

  async getDividends(
    symbol: string,
    options?: {
      from?: string;
      to?: string;
    }
  ) {
    let response = await this.http.get(`/div/${encodeURIComponent(symbol)}`, {
      params: this.params({
        from: options?.from,
        to: options?.to
      })
    });
    return response.data;
  }

  async getSplits(
    symbol: string,
    options?: {
      from?: string;
      to?: string;
    }
  ) {
    let response = await this.http.get(`/splits/${encodeURIComponent(symbol)}`, {
      params: this.params({
        from: options?.from,
        to: options?.to
      })
    });
    return response.data;
  }

  // ─── Insider Transactions ──────────────────────────────────────────

  async getInsiderTransactions(options?: {
    code?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    let response = await this.http.get('/insider-transactions', {
      params: this.params({
        code: options?.code,
        from: options?.from,
        to: options?.to,
        limit: options?.limit
      })
    });
    return response.data;
  }

  // ─── Options ───────────────────────────────────────────────────────

  async getOptionsChain(
    symbol: string,
    options?: {
      from?: string;
      to?: string;
      tradeDateFrom?: string;
      tradeDateTo?: string;
      contractName?: string;
    }
  ) {
    let response = await this.http.get(`/options/${encodeURIComponent(symbol)}`, {
      params: this.params({
        from: options?.from,
        to: options?.to,
        trade_date_from: options?.tradeDateFrom,
        trade_date_to: options?.tradeDateTo,
        contract_name: options?.contractName
      })
    });
    return response.data;
  }

  // ─── Macro Indicators ──────────────────────────────────────────────

  async getMacroIndicator(
    country: string,
    options?: {
      indicator?: string;
    }
  ) {
    let response = await this.http.get(`/macro-indicator/${encodeURIComponent(country)}`, {
      params: this.params({
        indicator: options?.indicator
      })
    });
    return response.data;
  }

  // ─── Exchange Info ─────────────────────────────────────────────────

  async getExchangesList() {
    let response = await this.http.get('/exchanges-list/', {
      params: this.params()
    });
    return response.data;
  }

  async getExchangeSymbols(
    exchangeCode: string,
    options?: {
      type?: string;
      delisted?: number;
    }
  ) {
    let response = await this.http.get(
      `/exchange-symbol-list/${encodeURIComponent(exchangeCode)}`,
      {
        params: this.params({
          type: options?.type,
          delisted: options?.delisted
        })
      }
    );
    return response.data;
  }

  // ─── Bulk API ──────────────────────────────────────────────────────

  async getBulkEod(
    exchangeCode: string,
    options?: {
      type?: string;
      date?: string;
      symbols?: string;
      filter?: string;
    }
  ) {
    let response = await this.http.get(
      `/eod-bulk-last-day/${encodeURIComponent(exchangeCode)}`,
      {
        params: this.params({
          type: options?.type,
          date: options?.date,
          symbols: options?.symbols,
          filter: options?.filter
        })
      }
    );
    return response.data;
  }

  async getEconomicEvents(options: {
    type?: string;
    from?: string;
    to?: string;
    country?: string;
    comparison?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/economic-events', { params: this.params(options) });
    return eodhdArray(response.data, 'economic events');
  }

  async getExchangeDetails(exchangeCode?: string) {
    let path = exchangeCode
      ? `/v2/exchange-details/${encodeURIComponent(exchangeCode)}`
      : '/v2/exchange-details';
    let response = await this.http.get(path, { params: this.params() });
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('EODHD returned invalid exchange details.', {
        reason: 'invalid_response'
      });
    }
    return response.data.data;
  }

  // ─── User ──────────────────────────────────────────────────────────

  async getUserInfo() {
    let response = await this.http.get('/user', {
      params: this.params()
    });
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('EODHD returned invalid account details.', {
        reason: 'invalid_response'
      });
    }
    return response.data;
  }
}
