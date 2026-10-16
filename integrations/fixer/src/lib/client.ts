import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

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
    type?: string;
    info?: string;
  };
}

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Fixer',
    reason: 'fixer_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: ['info', 'message', 'type', 'code', 'error_description'],
    nestedKeys: ['error', 'errors'],
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      let error = isApiErrorRecord(data) && isApiErrorRecord(data.error) ? data.error : data;
      if (!isApiErrorRecord(error)) return undefined;
      return typeof error.code === 'number' || typeof error.code === 'string'
        ? String(error.code)
        : undefined;
    }
  });

let validateDate = (date: string, field: string) => {
  let timestamp = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? Date.parse(`${date}T00:00:00.000Z`)
    : Number.NaN;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw createApiServiceError(
      `${field} must be a valid calendar date in YYYY-MM-DD format.`,
      {
        reason: 'fixer_invalid_date'
      }
    );
  }
  return timestamp;
};

let validatePeriod = (startDate: string, endDate: string, maximumDays?: number) => {
  let start = validateDate(startDate, 'startDate');
  let end = validateDate(endDate, 'endDate');
  if (end < start) {
    throw createApiServiceError('endDate must be on or after startDate.', {
      reason: 'fixer_invalid_timeframe'
    });
  }
  if (maximumDays !== undefined && end - start > maximumDays * 86_400_000) {
    throw createApiServiceError(`The requested period must not exceed ${maximumDays} days.`, {
      reason: 'fixer_invalid_timeframe'
    });
  }
};

export class Client {
  private axios;

  private accessKey: string | undefined;

  constructor(config: { token: string; apiHost?: 'apilayer' | 'fixer' }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Enter a non-empty Fixer API key.', {
        reason: 'fixer_missing_api_key'
      });
    }
    let direct = config.apiHost === 'fixer';
    this.accessKey = direct ? config.token : undefined;
    this.axios = createAuthenticatedAxios({
      baseURL: direct ? 'https://data.fixer.io/api' : 'https://api.apilayer.com/fixer',
      contentType: false,
      ...(direct ? {} : { authHeader: { name: 'apikey', value: config.token } }),
      errorAdapter: apiError
    });
  }

  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    let response = await this.axios.get<T | FixerErrorResponse>(path, {
      params: {
        ...params,
        ...(this.accessKey === undefined ? {} : { access_key: this.accessKey })
      }
    });
    if (isApiErrorRecord(response.data) && response.data.success === false) {
      throw apiError({ response });
    }
    return response.data as T;
  }

  async getLatestRates(params?: {
    base?: string;
    symbols?: string[];
  }): Promise<FixerRatesResponse> {
    let queryParams: Record<string, string> = {};
    if (params?.base) queryParams.base = params.base;
    if (params?.symbols?.length) queryParams.symbols = params.symbols.join(',');

    return this.get<FixerRatesResponse>('/latest', queryParams);
  }

  async getHistoricalRates(params: {
    date: string;
    base?: string;
    symbols?: string[];
  }): Promise<FixerRatesResponse> {
    validateDate(params.date, 'date');
    let queryParams: Record<string, string> = {};
    if (params.base) queryParams.base = params.base;
    if (params.symbols?.length) queryParams.symbols = params.symbols.join(',');

    return this.get<FixerRatesResponse>(`/${params.date}`, queryParams);
  }

  async convert(params: {
    from: string;
    to: string;
    amount: number;
    date?: string;
  }): Promise<FixerConvertResponse> {
    if (params.date) validateDate(params.date, 'date');
    let queryParams: Record<string, string | number> = {
      from: params.from,
      to: params.to,
      amount: params.amount
    };
    if (params.date) queryParams.date = params.date;

    return this.get<FixerConvertResponse>('/convert', queryParams);
  }

  async getTimeSeries(params: {
    startDate: string;
    endDate: string;
    base?: string;
    symbols?: string[];
  }): Promise<FixerTimeSeriesResponse> {
    validatePeriod(params.startDate, params.endDate, 365);
    let queryParams: Record<string, string> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.base) queryParams.base = params.base;
    if (params.symbols?.length) queryParams.symbols = params.symbols.join(',');

    return this.get<FixerTimeSeriesResponse>('/timeseries', queryParams);
  }

  async getFluctuation(params: {
    startDate: string;
    endDate: string;
    base?: string;
    symbols?: string[];
  }): Promise<FixerFluctuationResponse> {
    validatePeriod(params.startDate, params.endDate);
    let queryParams: Record<string, string> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.base) queryParams.base = params.base;
    if (params.symbols?.length) queryParams.symbols = params.symbols.join(',');

    return this.get<FixerFluctuationResponse>('/fluctuation', queryParams);
  }

  async getSymbols(): Promise<FixerSymbolsResponse> {
    return this.get<FixerSymbolsResponse>('/symbols');
  }
}
