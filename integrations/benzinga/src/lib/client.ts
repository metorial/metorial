import { createAxios } from 'slates';

export class BenzingaClient {
  private token: string;
  private axiosV2;
  private axiosV2_1;
  private axiosV1;
  private axiosMovers;
  private axiosGov;
  private axiosSec;

  constructor(config: { token: string }) {
    this.token = config.token;

    this.axiosV2 = createAxios({
      baseURL: 'https://api.benzinga.com/api/v2',
      headers: { accept: 'application/json' }
    });

    this.axiosV2_1 = createAxios({
      baseURL: 'https://api.benzinga.com/api/v2.1',
      headers: { accept: 'application/json' }
    });

    this.axiosV1 = createAxios({
      baseURL: 'https://api.benzinga.com/api/v1',
      headers: { accept: 'application/json' }
    });

    this.axiosMovers = createAxios({
      baseURL: 'https://api.benzinga.com/api/v1/market',
      headers: { accept: 'application/json' }
    });

    this.axiosGov = createAxios({
      baseURL: 'https://api.benzinga.com/api/v1/gov/usa/congress',
      headers: { accept: 'application/json' }
    });

    this.axiosSec = createAxios({
      baseURL: 'https://api.benzinga.com/api/v1',
      headers: { accept: 'application/json' }
    });
  }

  // ---- News ----

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
  }) {
    let res = await this.axiosV2.get('/news', {
      params: {
        token: this.token,
        page: params.page,
        pageSize: params.pageSize,
        displayOutput: params.displayOutput,
        date: params.date,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        updatedSince: params.updatedSince,
        publishedSince: params.publishedSince,
        sort: params.sort,
        tickers: params.tickers,
        channels: params.channels,
        topics: params.topics,
        authors: params.authors,
        content_types: params.contentTypes
      }
    });
    return res.data;
  }

  // ---- WIIMs (Why Is It Moving) ----

  async getWiims(params: {
    searchKeys?: string;
    updatedSince?: number;
    country?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axiosV2.get('/wiims', {
      params: {
        token: this.token,
        search_keys: params.searchKeys,
        search_keys_type: params.searchKeys ? 'symbol' : undefined,
        updated_since: params.updatedSince,
        country: params.country,
        page: params.page,
        pagesize: params.pageSize
      }
    });
    return res.data;
  }

  // ---- Calendar Endpoints ----

  async getCalendarRatings(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
    importance?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/ratings', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated,
        'parameters[importance]': params.importance
      }
    });
    return res.data;
  }

  async getCalendarEarnings(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
    importance?: number;
  }) {
    let res = await this.axiosV2_1.get('/calendar/earnings', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated,
        'parameters[importance]': params.importance
      }
    });
    return res.data;
  }

  async getCalendarDividends(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
    importance?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/dividends', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated,
        'parameters[importance]': params.importance
      }
    });
    return res.data;
  }

  async getCalendarEconomics(params: {
    page?: number;
    pageSize?: number;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
    importance?: number;
    country?: string;
  }) {
    let res = await this.axiosV2.get('/calendar/economics', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated,
        'parameters[importance]': params.importance,
        'parameters[country]': params.country
      }
    });
    return res.data;
  }

  async getCalendarIPOs(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/ipos', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated
      }
    });
    return res.data;
  }

  async getCalendarGuidance(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
    importance?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/guidance', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated,
        'parameters[importance]': params.importance
      }
    });
    return res.data;
  }

  async getCalendarSplits(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
    importance?: number;
  }) {
    let res = await this.axiosV2_1.get('/calendar/splits', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated,
        'parameters[importance]': params.importance
      }
    });
    return res.data;
  }

  async getCalendarMA(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/ma', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated
      }
    });
    return res.data;
  }

  async getCalendarOfferings(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/offerings', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated
      }
    });
    return res.data;
  }

  async getCalendarFDA(params: {
    page?: number;
    pageSize?: number;
    securities?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/fda', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[securities]': params.securities,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated
      }
    });
    return res.data;
  }

  async getCalendarConferenceCalls(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    let res = await this.axiosV2.get('/calendar/conference-calls', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated
      }
    });
    return res.data;
  }

  // ---- Market Movers ----

  async getMovers(params: {
    maxResults?: number;
    from?: string;
    to?: string;
    session?: 'REGULAR' | 'PRE_MARKET' | 'AFTER_MARKET';
    screenerQuery?: string;
  }) {
    let res = await this.axiosMovers.get('/movers', {
      params: {
        token: this.token,
        maxResults: params.maxResults,
        from: params.from,
        to: params.to,
        session: params.session,
        screenerQuery: params.screenerQuery
      }
    });
    return res.data;
  }

  // ---- Signals (Options Activity) ----

  async getOptionActivity(params: {
    page?: number;
    pageSize?: number;
    tickers?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    updated?: number;
  }) {
    let res = await this.axiosV1.get('/signal/option_activity', {
      params: {
        token: this.token,
        page: params.page,
        pagesize: params.pageSize,
        'parameters[tickers]': params.tickers,
        'parameters[date_from]': params.dateFrom,
        'parameters[date_to]': params.dateTo,
        'parameters[date]': params.date,
        'parameters[updated]': params.updated
      }
    });
    return res.data;
  }

  // ---- Delayed Quotes ----

  async getDelayedQuotes(params: { symbols?: string; isin?: string; cik?: string }) {
    let res = await this.axiosV2.get('/quoteDelayed', {
      params: {
        token: this.token,
        symbols: params.symbols,
        isin: params.isin,
        cik: params.cik
      }
    });
    return res.data;
  }

  // ---- Historical Bars ----

  async getBars(params: {
    symbols: string;
    from?: string;
    to?: string;
    interval?: '1D' | '1H' | '5M' | '15M' | '30M' | '1W' | '1MONTH';
  }) {
    let res = await this.axiosV2.get('/bars', {
      params: {
        token: this.token,
        symbols: params.symbols,
        from: params.from,
        to: params.to,
        interval: params.interval
      }
    });
    return res.data;
  }

  // ---- Company Fundamentals ----

  async getFundamentals(params: { symbols: string; asOf?: string }) {
    let res = await this.axiosV2_1.get('/fundamentals', {
      params: {
        token: this.token,
        symbols: params.symbols,
        asOf: params.asOf
      }
    });
    return res.data;
  }

  async getCompanyProfile(params: { symbols: string; asOf?: string }) {
    let res = await this.axiosV2_1.get('/fundamentals/companyProfile', {
      params: {
        token: this.token,
        symbols: params.symbols,
        asOf: params.asOf
      }
    });
    return res.data;
  }

  async getFinancials(params: {
    symbols: string;
    asOf?: string;
    period?: string;
    reportType?: string;
  }) {
    let res = await this.axiosV2_1.get('/fundamentals/financials', {
      params: {
        token: this.token,
        symbols: params.symbols,
        asOf: params.asOf,
        period: params.period,
        reportType: params.reportType
      }
    });
    return res.data;
  }

  async getValuationRatios(params: { symbols: string; asOf?: string }) {
    let res = await this.axiosV2_1.get('/fundamentals/valuationRatios', {
      params: {
        token: this.token,
        symbols: params.symbols,
        asOf: params.asOf
      }
    });
    return res.data;
  }

  // ---- Corporate Logos ----

  async searchLogos(params: {
    searchKeys: string;
    searchKeysType?: 'symbol' | 'cik' | 'cusip' | 'isin';
    fields?: string;
  }) {
    let res = await this.axiosV2.get('/logos/search', {
      params: {
        token: this.token,
        search_keys: params.searchKeys,
        search_keys_type: params.searchKeysType || 'symbol',
        fields:
          params.fields ||
          'logo_light,logo_dark,logo_vector_light,logo_vector_dark,mark_light,mark_dark'
      }
    });
    return res.data;
  }

  // ---- Government Trades ----

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
    let res = await this.axiosGov.get('/trades', {
      params: {
        token: this.token,
        chamber: params.chamber,
        date: params.date,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        search_keys: params.searchKeys,
        page: params.page,
        pagesize: params.pageSize,
        updated_since: params.updatedSince
      }
    });
    return res.data;
  }

  // ---- SEC Filings / Insider Transactions ----

  async getInsiderTransactions(params: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    searchKeys?: string;
    searchKeysType?: 'symbol' | 'accession_number' | 'id';
    page?: number;
    pageSize?: number;
    updatedSince?: number;
  }) {
    let res = await this.axiosSec.get('/insider_transactions/filings', {
      params: {
        token: this.token,
        date: params.date,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        search_keys: params.searchKeys,
        search_keys_type: params.searchKeysType || 'symbol',
        page: params.page,
        pagesize: params.pageSize,
        updated_since: params.updatedSince
      }
    });
    return res.data;
  }

  // ---- Short Interest ----

  async getShortInterest(params: {
    symbols: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axiosV1.get('/shortinterest', {
      params: {
        token: this.token,
        symbols: params.symbols,
        from: params.from,
        to: params.to,
        page: params.page,
        pageSize: params.pageSize
      }
    });
    return res.data;
  }
}
