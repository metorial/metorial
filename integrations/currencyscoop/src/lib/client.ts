import { createAxios } from 'slates';

export interface LatestRatesParams {
  base?: string;
  symbols?: string[];
}

export interface LatestRatesResponse {
  date: string;
  base: string;
  rates: Record<string, number>;
}

export interface HistoricalRatesParams {
  date: string;
  base?: string;
  symbols?: string[];
}

export interface HistoricalRatesResponse {
  date: string;
  base: string;
  rates: Record<string, number>;
}

export interface ConvertParams {
  from: string;
  to: string;
  amount: number;
  date?: string;
}

export interface ConvertResponse {
  timestamp: number;
  date: string;
  from: string;
  to: string;
  amount: number;
  value: number;
}

export interface TimeSeriesParams {
  startDate: string;
  endDate: string;
  base?: string;
  symbols?: string[];
}

export interface TimeSeriesResponse {
  base: string;
  startDate: string;
  endDate: string;
  rates: Record<string, Record<string, number>>;
}

export interface CurrencyInfo {
  currencyId: number;
  name: string;
  shortCode: string;
  code: string;
  precision: number;
  subunit: number;
  symbol: string;
  symbolFirst: boolean;
  decimalMark: string;
  thousandsSeparator: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.currencybeacon.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async getLatestRates(params: LatestRatesParams = {}): Promise<LatestRatesResponse> {
    let queryParams: Record<string, string> = {};
    if (params.base) {
      queryParams.base = params.base;
    }
    if (params.symbols && params.symbols.length > 0) {
      queryParams.symbols = params.symbols.join(',');
    }

    let response = await this.axios.get('/latest', { params: queryParams });
    let data = response.data;
    return {
      date: data.response.date,
      base: data.response.base,
      rates: data.response.rates
    };
  }

  async getHistoricalRates(params: HistoricalRatesParams): Promise<HistoricalRatesResponse> {
    let queryParams: Record<string, string> = {
      date: params.date
    };
    if (params.base) {
      queryParams.base = params.base;
    }
    if (params.symbols && params.symbols.length > 0) {
      queryParams.symbols = params.symbols.join(',');
    }

    let response = await this.axios.get('/historical', { params: queryParams });
    let data = response.data;
    return {
      date: data.response.date,
      base: data.response.base,
      rates: data.response.rates
    };
  }

  async convert(params: ConvertParams): Promise<ConvertResponse> {
    let queryParams: Record<string, string> = {
      from: params.from,
      to: params.to,
      amount: String(params.amount)
    };
    if (params.date) {
      queryParams.date = params.date;
    }

    let response = await this.axios.get('/convert', { params: queryParams });
    let data = response.data;
    return {
      timestamp: data.response.timestamp,
      date: data.response.date,
      from: data.response.from,
      to: data.response.to,
      amount: data.response.amount,
      value: data.response.value
    };
  }

  async getTimeSeries(params: TimeSeriesParams): Promise<TimeSeriesResponse> {
    let queryParams: Record<string, string> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.base) {
      queryParams.base = params.base;
    }
    if (params.symbols && params.symbols.length > 0) {
      queryParams.symbols = params.symbols.join(',');
    }

    let response = await this.axios.get('/timeseries', { params: queryParams });
    let data = response.data;
    return {
      base: data.response.base,
      startDate: data.response.start_date,
      endDate: data.response.end_date,
      rates: data.response.rates
    };
  }

  async listCurrencies(): Promise<CurrencyInfo[]> {
    let response = await this.axios.get('/currencies');
    let data = response.data;

    let currencies: CurrencyInfo[] = data.response.map((c: any) => ({
      currencyId: c.id,
      name: c.name,
      shortCode: c.short_code,
      code: c.code,
      precision: c.precision,
      subunit: c.subunit,
      symbol: c.symbol,
      symbolFirst: c.symbol_first,
      decimalMark: c.decimal_mark,
      thousandsSeparator: c.thousands_separator
    }));

    return currencies;
  }
}
