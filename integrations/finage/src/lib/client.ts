import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

let http = createAxios({
  baseURL: 'https://api.finage.co.uk',
  timeout: 30000
});

export class FinageClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('Provide a Finage API key.');
    this.apiKey = config.token;
  }

  private params(extra: Record<string, string | number | boolean | undefined> = {}) {
    let result: Record<string, string | number | boolean> = { apikey: this.apiKey };
    for (let [k, v] of Object.entries(extra)) {
      if (v !== undefined) {
        result[k] = v;
      }
    }
    return result;
  }

  private async get(
    path: string,
    options: { params: Record<string, string | number | boolean> }
  ) {
    try {
      let { data } = await http.get<unknown>(path, options);
      if (
        isApiErrorRecord(data) &&
        (data.success === false ||
          data.status === 'error' ||
          data.error ||
          (Array.isArray(data.errors) && data.errors.length > 0) ||
          (isApiErrorRecord(data.errors) && Object.keys(data.errors).length > 0))
      ) {
        throw buildApiServiceError(
          { response: { status: 200, data } },
          {
            providerLabel: 'Finage',
            reason: 'finage_api_error',
            nestedKeys: ['errors', 'error', 'data']
          }
        );
      }
      if (typeof data !== 'object' || data === null)
        throw createApiServiceError('Finage returned an invalid response.');
      return data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Finage',
        reason: 'finage_api_error',
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        nestedKeys: ['errors', 'error', 'data']
      });
    }
  }

  // ── Stock Market Data ──

  async getStockLastQuote(symbol: string) {
    let res = await this.get(`/last/stock/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getStockLastTrade(symbol: string) {
    let res = await this.get(`/last/trade/stock/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getStockPreviousClose(symbol: string) {
    let res = await this.get(`/agg/stock/prev-close/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getStockAggregates(opts: {
    symbol: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    limit?: number;
    sort?: string;
  }) {
    let res = await this.get(
      `/agg/stock/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit ?? 100,
          sort: opts.sort,
          date_format: 'ts'
        })
      }
    );
    return res;
  }

  async getStockSnapshot(opts?: { symbols?: string; quotes?: boolean; trades?: boolean }) {
    let res = await this.get('/snapshot/stock', {
      params: this.params({
        symbols: opts?.symbols,
        quotes: opts?.quotes,
        trades: opts?.trades
      })
    });
    return res;
  }

  // ── Forex Data ──

  async getForexLastQuote(symbol: string) {
    let res = await this.get(`/last/forex/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getForexLastTrade(symbol: string) {
    let res = await this.get(`/last/trade/forex/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async convertCurrency(from: string, to: string, amount: number) {
    let res = await this.get(
      `/convert/forex/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${amount}`,
      {
        params: this.params()
      }
    );
    return res;
  }

  async getForexPreviousClose(symbol: string) {
    let res = await this.get(`/agg/forex/prev-close/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getForexAggregates(opts: {
    symbol: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    limit?: number;
    sort?: string;
  }) {
    let res = await this.get(
      `/agg/forex/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit ?? 100,
          sort: opts.sort,
          date_format: 'ts'
        })
      }
    );
    return res;
  }

  // ── Cryptocurrency Data ──

  async getCryptoLastTrade(symbol: string) {
    let res = await this.get(`/last/crypto/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getCryptoLastQuote(symbol: string) {
    let res = await this.get(`/last/quote/crypto/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getCryptoPreviousClose(symbol: string) {
    let res = await this.get(`/agg/crypto/prev-close/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  async getCryptoAggregates(opts: {
    symbol: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    limit?: number;
    sort?: string;
  }) {
    let res = await this.get(
      `/agg/crypto/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit ?? 100,
          sort: opts.sort
        })
      }
    );
    return res;
  }

  async convertCrypto(from: string, to: string, amount: number) {
    let res = await this.get(
      `/convert/crypto/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${amount}`,
      {
        params: this.params()
      }
    );
    return res;
  }

  // ── Fundamentals ──

  async getIncomeStatement(symbol: string, opts?: { limit?: number; period?: string }) {
    let res = await this.get(`/fnd/income-statement/${encodeURIComponent(symbol)}`, {
      params: this.params({
        limit: opts?.limit,
        period: opts?.period
      })
    });
    return res;
  }

  async getBalanceSheet(symbol: string, opts?: { limit?: number; period?: string }) {
    let res = await this.get(`/fnd/balance-sheet-statements/${encodeURIComponent(symbol)}`, {
      params: this.params({
        limit: opts?.limit,
        period: opts?.period
      })
    });
    return res;
  }

  async getCashFlow(symbol: string, opts?: { limit?: number; period?: string }) {
    let res = await this.get(`/fnd/cash-flow-statement/${encodeURIComponent(symbol)}`, {
      params: this.params({
        limit: opts?.limit,
        period: opts?.period
      })
    });
    return res;
  }

  async getStockDetails(symbol: string) {
    let res = await this.get(`/fnd/detail/stock/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res;
  }

  // ── Market News ──

  async getMarketNews(symbol: string, opts?: { page?: number; limit?: number }) {
    let res = await this.get(`/news/market/${encodeURIComponent(symbol)}`, {
      params: this.params({
        page: opts?.page,
        limit: opts?.limit
      })
    });
    return res;
  }

  async getCryptoNews(opts?: { symbol?: string; page?: number; limit?: number }) {
    let url = opts?.symbol
      ? `/news/cryptocurrency/${encodeURIComponent(opts.symbol)}`
      : '/news/cryptocurrency';
    let res = await this.get(url, {
      params: this.params({
        page: opts?.page,
        limit: opts?.limit
      })
    });
    return res;
  }

  // ── Market Movers ──

  async getMostActive() {
    let res = await this.get('/fnd/market-information/us/most-actives', {
      params: this.params()
    });
    return res;
  }

  async getTopGainers() {
    let res = await this.get('/fnd/market-information/us/most-gainers', {
      params: this.params()
    });
    return res;
  }

  async getTopLosers() {
    let res = await this.get('/fnd/market-information/us/most-losers', {
      params: this.params()
    });
    return res;
  }

  // ── Market Reference ──

  async searchMarket(market: string, query: string, limit?: number) {
    let res = await this.get(
      `/fnd/search/market/${encodeURIComponent(market)}/${encodeURIComponent(query)}`,
      {
        params: this.params({ limit })
      }
    );
    return res;
  }

  async getMarketStatus() {
    let res = await this.get('/marketstatus', {
      params: this.params()
    });
    return res;
  }

  // ── Technical Indicators ──

  async getTechnicalIndicator(opts: {
    indicatorType: string;
    timespan: string;
    symbol: string;
    period?: number;
  }) {
    let res = await this.get(
      `/fnd/technical-indicator/${opts.indicatorType.toLowerCase()}/${opts.timespan}/${encodeURIComponent(opts.symbol)}`,
      {
        params: this.params({
          period: opts.period
        })
      }
    );
    return res;
  }

  async getStockSignals(symbol: string, interval?: string) {
    let res = await this.get(
      `/fnd/signals/us-stock/${interval || 'daily'}/${encodeURIComponent(symbol)}`,
      {
        params: this.params()
      }
    );
    return res;
  }

  // ── Sector Performance ──

  async getSectorPerformance() {
    let res = await this.get('/fnd/market-information/us/sector-performance', {
      params: this.params()
    });
    return res;
  }

  // ── Economic Calendar ──

  async getEconomicCalendar(from?: string, to?: string) {
    let res = await this.get('/fnd/economic-calendar', {
      params: this.params({ from, to })
    });
    return res;
  }

  // ── Earnings Calendar ──

  async getEarningsCalendar() {
    let res = await this.get('/fnd/earning-calendar', {
      params: this.params()
    });
    return res;
  }

  async listSymbols(type: string, page?: number, search?: string) {
    return this.get(`/symbol-list/${encodeURIComponent(type)}`, {
      params: this.params({ page, search })
    });
  }
}
