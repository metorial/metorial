import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.finage.co.uk'
});

export class FinageClient {
  private apiKey: string;

  constructor(config: { token: string }) {
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

  // ── Stock Market Data ──

  async getStockLastQuote(symbol: string) {
    let res = await http.get(`/last/stock/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  async getStockLastTrade(symbol: string) {
    let res = await http.get(`/last/trade/stock/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  async getStockPreviousClose(symbol: string) {
    let res = await http.get(`/agg/stock/prev-close/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
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
    let res = await http.get(
      `/agg/stock/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit,
          sort: opts.sort
        })
      }
    );
    return res.data;
  }

  async getStockSnapshot(opts?: { symbols?: string; quotes?: boolean; trades?: boolean }) {
    let res = await http.get('/snapshot/stock', {
      params: this.params({
        symbols: opts?.symbols,
        quotes: opts?.quotes,
        trades: opts?.trades
      })
    });
    return res.data;
  }

  // ── Forex Data ──

  async getForexLastQuote(symbol: string) {
    let res = await http.get(`/last/forex/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  async getForexLastTrade(symbol: string) {
    let res = await http.get(`/last/trade/forex/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  async convertCurrency(from: string, to: string, amount: number) {
    let res = await http.get(
      `/convert/forex/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${amount}`,
      {
        params: this.params()
      }
    );
    return res.data;
  }

  async getForexPreviousClose(symbol: string) {
    let res = await http.get(`/agg/forex/prev-close/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
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
    let res = await http.get(
      `/agg/forex/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit,
          sort: opts.sort
        })
      }
    );
    return res.data;
  }

  // ── Cryptocurrency Data ──

  async getCryptoLastTrade(symbol: string) {
    let res = await http.get(`/last/crypto/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  async getCryptoLastQuote(symbol: string) {
    let res = await http.get(`/last/quote/crypto/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  async getCryptoPreviousClose(symbol: string) {
    let res = await http.get(`/agg/crypto/prev-close/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
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
    let res = await http.get(
      `/agg/crypto/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit,
          sort: opts.sort
        })
      }
    );
    return res.data;
  }

  async convertCrypto(from: string, to: string, amount: number) {
    let res = await http.get(
      `/convert/crypto/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${amount}`,
      {
        params: this.params()
      }
    );
    return res.data;
  }

  // ── Fundamentals ──

  async getIncomeStatement(symbol: string, opts?: { limit?: number; period?: string }) {
    let res = await http.get(`/fnd/income-statement/${encodeURIComponent(symbol)}`, {
      params: this.params({
        limit: opts?.limit,
        period: opts?.period
      })
    });
    return res.data;
  }

  async getBalanceSheet(symbol: string, opts?: { limit?: number; period?: string }) {
    let res = await http.get(`/balance-sheet-statements/${encodeURIComponent(symbol)}`, {
      params: this.params({
        limit: opts?.limit,
        period: opts?.period
      })
    });
    return res.data;
  }

  async getCashFlow(symbol: string, opts?: { limit?: number; period?: string }) {
    let res = await http.get(`/cash-flow-statement/${encodeURIComponent(symbol)}`, {
      params: this.params({
        limit: opts?.limit,
        period: opts?.period
      })
    });
    return res.data;
  }

  async getStockDetails(symbol: string) {
    let res = await http.get(`/detail/stock/${encodeURIComponent(symbol)}`, {
      params: this.params()
    });
    return res.data;
  }

  // ── Market News ──

  async getMarketNews(symbol: string, opts?: { page?: number; limit?: number }) {
    let res = await http.get(`/news/market/${encodeURIComponent(symbol)}`, {
      params: this.params({
        page: opts?.page,
        limit: opts?.limit
      })
    });
    return res.data;
  }

  async getCryptoNews(opts?: { symbol?: string; page?: number; limit?: number }) {
    let url = opts?.symbol
      ? `/news/crypto/${encodeURIComponent(opts.symbol)}`
      : '/news/crypto';
    let res = await http.get(url, {
      params: this.params({
        page: opts?.page,
        limit: opts?.limit
      })
    });
    return res.data;
  }

  // ── Market Movers ──

  async getMostActive() {
    let res = await http.get('/fnd/market-information/us/most-active', {
      params: this.params()
    });
    return res.data;
  }

  async getTopGainers() {
    let res = await http.get('/fnd/market-information/us/most-gainers', {
      params: this.params()
    });
    return res.data;
  }

  async getTopLosers() {
    let res = await http.get('/fnd/market-information/us/most-losers', {
      params: this.params()
    });
    return res.data;
  }

  // ── Market Reference ──

  async searchMarket(market: string, query: string, limit?: number) {
    let res = await http.get(
      `/fnd/search/market/${encodeURIComponent(market)}/${encodeURIComponent(query)}`,
      {
        params: this.params({ limit })
      }
    );
    return res.data;
  }

  async getMarketStatus() {
    let res = await http.get('/marketstatus', {
      params: this.params()
    });
    return res.data;
  }

  // ── Technical Indicators ──

  async getTechnicalIndicator(opts: {
    indicatorType: string;
    timespan: string;
    symbol: string;
    period?: number;
  }) {
    let res = await http.get(
      `/fnd/technical-indicator/${opts.indicatorType}/${opts.timespan}/${encodeURIComponent(opts.symbol)}`,
      {
        params: this.params({
          period: opts.period
        })
      }
    );
    return res.data;
  }

  async getStockSignals(symbol: string, interval?: string) {
    let res = await http.get(
      `/fnd/signals/us-stock/${interval || 'daily'}/${encodeURIComponent(symbol)}`,
      {
        params: this.params()
      }
    );
    return res.data;
  }

  // ── Sector Performance ──

  async getSectorPerformance() {
    let res = await http.get('/fnd/market-information/us/sector-performance', {
      params: this.params()
    });
    return res.data;
  }

  // ── Economic Calendar ──

  async getEconomicCalendar(from?: string, to?: string) {
    let res = await http.get('/fnd/economic-calendar', {
      params: this.params({ from, to })
    });
    return res.data;
  }

  // ── Earnings Calendar ──

  async getEarningsCalendar(from?: string, to?: string) {
    let res = await http.get('/fnd/earnings-calendar', {
      params: this.params({ from, to })
    });
    return res.data;
  }

  // ── ETF Data ──

  async getEtfAggregates(opts: {
    symbol: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    limit?: number;
    sort?: string;
  }) {
    let res = await http.get(
      `/agg/etf/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit,
          sort: opts.sort
        })
      }
    );
    return res.data;
  }

  // ── Index Data ──

  async getIndexAggregates(opts: {
    symbol: string;
    multiplier: number;
    timespan: string;
    from: string;
    to: string;
    limit?: number;
    sort?: string;
  }) {
    let res = await http.get(
      `/agg/index/${encodeURIComponent(opts.symbol)}/${opts.multiplier}/${opts.timespan}/${opts.from}/${opts.to}`,
      {
        params: this.params({
          limit: opts.limit,
          sort: opts.sort
        })
      }
    );
    return res.data;
  }
}
