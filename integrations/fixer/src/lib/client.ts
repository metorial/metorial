import { createAxios } from 'slates';

export interface FixerRatesResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface FixerConvertResponse {
  success: boolean;
  query: {
    from: string;
    to: string;
    amount: number;
  };
  info: {
    timestamp: number;
    rate: number;
  };
  historical: boolean;
  date: string;
  result: number;
}

export interface FixerTimeSeriesResponse {
  success: boolean;
  timeseries: boolean;
  start_date: string;
  end_date: string;
  base: string;
  rates: Record<string, Record<string, number>>;
}

export interface FixerFluctuationResponse {
  success: boolean;
  fluctuation: boolean;
  start_date: string;
  end_date: string;
  base: string;
  rates: Record<
    string,
    {
      start_rate: number;
      end_rate: number;
      change: number;
      change_pct: number;
    }
  >;
}

export interface FixerSymbolsResponse {
  success: boolean;
  symbols: Record<string, string>;
}

export interface FixerErrorResponse {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.apilayer.com/fixer',
      headers: {
        apikey: config.token
      }
    });
  }

  async getLatestRates(params?: {
    base?: string;
    symbols?: string[];
  }): Promise<FixerRatesResponse> {
    let queryParams: Record<string, string> = {};
    if (params?.base) queryParams.base = params.base;
    if (params?.symbols?.length) queryParams.symbols = params.symbols.join(',');

    let response = await this.axios.get('/latest', { params: queryParams });
    return response.data;
  }

  async getHistoricalRates(params: {
    date: string;
    base?: string;
    symbols?: string[];
  }): Promise<FixerRatesResponse> {
    let queryParams: Record<string, string> = {};
    if (params.base) queryParams.base = params.base;
    if (params.symbols?.length) queryParams.symbols = params.symbols.join(',');

    let response = await this.axios.get(`/${params.date}`, { params: queryParams });
    return response.data;
  }

  async convert(params: {
    from: string;
    to: string;
    amount: number;
    date?: string;
  }): Promise<FixerConvertResponse> {
    let queryParams: Record<string, string | number> = {
      from: params.from,
      to: params.to,
      amount: params.amount
    };
    if (params.date) queryParams.date = params.date;

    let response = await this.axios.get('/convert', { params: queryParams });
    return response.data;
  }

  async getTimeSeries(params: {
    startDate: string;
    endDate: string;
    base?: string;
    symbols?: string[];
  }): Promise<FixerTimeSeriesResponse> {
    let queryParams: Record<string, string> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.base) queryParams.base = params.base;
    if (params.symbols?.length) queryParams.symbols = params.symbols.join(',');

    let response = await this.axios.get('/timeseries', { params: queryParams });
    return response.data;
  }

  async getFluctuation(params: {
    startDate: string;
    endDate: string;
    base?: string;
    symbols?: string[];
  }): Promise<FixerFluctuationResponse> {
    let queryParams: Record<string, string> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.base) queryParams.base = params.base;
    if (params.symbols?.length) queryParams.symbols = params.symbols.join(',');

    let response = await this.axios.get('/fluctuation', { params: queryParams });
    return response.data;
  }

  async getSymbols(): Promise<FixerSymbolsResponse> {
    let response = await this.axios.get('/symbols');
    return response.data;
  }
}
