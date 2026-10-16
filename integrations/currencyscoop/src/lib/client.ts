import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

let rateResponseSchema = z.object({
  date: z.string(),
  base: z.string(),
  rates: z.record(z.string(), z.number())
});

let conversionResponseSchema = z.object({
  timestamp: z.number(),
  date: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.number(),
  value: z.number()
});

let timeSeriesResponseSchema = z.object({
  base: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  rates: z.record(z.string(), z.record(z.string(), z.number()))
});

let currencyResponseSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    short_code: z.string(),
    code: z.string(),
    precision: z.number(),
    subunit: z.number(),
    symbol: z.string(),
    symbol_first: z.boolean(),
    decimal_mark: z.string(),
    thousands_separator: z.string()
  })
);

let currencyBeaconError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'CurrencyBeacon',
    reason: 'currencyscoop_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    nestedKeys: ['meta', 'response', 'errors'],
    detailKeys: ['message', 'detail', 'error', 'error_description', 'error_type'],
    extractUpstreamCode: (_input, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body) || !isApiErrorRecord(body.meta)) return undefined;
      let code = body.meta.code;
      return typeof code === 'number' || typeof code === 'string' ? String(code) : undefined;
    }
  });

export interface LatestRatesParams {
  base?: string;
  symbols?: string[];
}

export interface LatestRatesResponse {
  date: string;
  base: string;
  rates: Record<string, number>;
  raw: Record<string, unknown>;
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
  raw: Record<string, unknown>;
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
  raw: Record<string, unknown>;
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
  raw: Record<string, unknown>;
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
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.currencybeacon.com/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30_000,
      errorAdapter: currencyBeaconError
    });
  }

  private async request<T>(
    path: string,
    params: Record<string, string>,
    schema: z.ZodType<T>
  ): Promise<{ response: T; raw: Record<string, unknown> }> {
    let { data, status } = await this.axios.get<unknown>(path, { params });
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('CurrencyBeacon returned an invalid response envelope.', {
        reason: 'currencyscoop_invalid_response'
      });
    }
    let code = isApiErrorRecord(data.meta) ? data.meta.code : undefined;
    if (
      (typeof code === 'number' || typeof code === 'string') &&
      Number.isFinite(Number(code)) &&
      (Number(code) < 200 || Number(code) >= 300)
    ) {
      throw currencyBeaconError({ response: { status, data } });
    }
    let parsed = schema.safeParse(data.response);
    if (!parsed.success) {
      let fields = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
      throw createApiServiceError(
        `CurrencyBeacon returned missing or invalid ${path} response fields: ${fields}.`,
        { reason: 'currencyscoop_invalid_response' }
      );
    }
    return { response: parsed.data, raw: data };
  }

  async getLatestRates(params: LatestRatesParams = {}): Promise<LatestRatesResponse> {
    let queryParams: Record<string, string> = {};
    if (params.base) {
      queryParams.base = params.base;
    }
    if (params.symbols && params.symbols.length > 0) {
      queryParams.symbols = params.symbols.join(',');
    }

    let { response, raw } = await this.request('/latest', queryParams, rateResponseSchema);
    return {
      ...response,
      raw
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

    let { response, raw } = await this.request('/historical', queryParams, rateResponseSchema);
    return {
      ...response,
      raw
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

    let { response, raw } = await this.request(
      '/convert',
      queryParams,
      conversionResponseSchema
    );
    return {
      ...response,
      raw
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

    let { response, raw } = await this.request(
      '/timeseries',
      queryParams,
      timeSeriesResponseSchema
    );
    return {
      base: response.base,
      startDate: response.start_date,
      endDate: response.end_date,
      rates: response.rates,
      raw
    };
  }

  async listCurrencies(): Promise<{
    currencies: CurrencyInfo[];
    raw: Record<string, unknown>;
  }> {
    let { response, raw } = await this.request('/currencies', {}, currencyResponseSchema);

    let currencies: CurrencyInfo[] = response.map(c => ({
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

    return { currencies, raw };
  }
}
