import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

type QueryValue = string | number | boolean | string[] | undefined;

export interface FullResultsParams {
  input: string;
  format?: string;
  includePodId?: string;
  includePodIds?: string[];
  excludePodId?: string;
  excludePodIds?: string[];
  podTitle?: string;
  podIndex?: string;
  scanner?: string;
  assumption?: string | string[];
  podState?: string;
  podStates?: string[];
  units?: string;
  ip?: string;
  latLong?: string;
  location?: string;
  timeout?: number;
  maxWidth?: number;
  significantDigits?: number;
  reinterpret?: boolean;
}

export interface ShortAnswerParams {
  input: string;
  units?: string;
  timeout?: number;
}

export type SpokenResultParams = ShortAnswerParams;

export interface SimpleImageParams extends ShortAnswerParams {
  layout?: string;
  background?: string;
  foreground?: string;
  fontsize?: number;
  width?: number;
}

export interface LlmQueryParams {
  input: string;
  maxchars?: number;
  units?: string;
  assumption?: string | string[];
  location?: string;
  ip?: string;
  latLong?: string;
}

export interface ValidateQueryParams {
  input: string;
}

export interface FastQueryRecognizerParams extends ValidateQueryParams {
  mode?: 'Default' | 'Voice';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Wolfram Alpha AppID is required. Reconnect with a valid AppID.'
      );
    }
    this.token = config.token;
    this.axios = createAxios({ timeout: 90_000 });
  }

  private query(input: string, values: Record<string, QueryValue>) {
    if (!input.trim()) throw createApiServiceError('Enter a non-empty query to compute.');
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue;
      if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
        throw createApiServiceError(`${key} must be a positive number.`);
      }
      for (const item of Array.isArray(value) ? value : [value]) {
        query.append(key, String(item));
      }
    }
    return query;
  }

  private validateLocation(params: { ip?: string; latLong?: string; location?: string }) {
    if (
      [params.ip, params.latLong, params.location].filter(value => value !== undefined)
        .length > 1
    ) {
      throw createApiServiceError(
        'Specify only one location, IP address, or latitude/longitude pair.'
      );
    }
  }

  private async request<T>(
    operation: string,
    url: string,
    query: URLSearchParams,
    responseType: 'json' | 'text'
  ): Promise<T> {
    query.set('appid', this.token);
    return requestAxiosData<T>(
      operation,
      () => this.axios.get<T>(url, { params: query, responseType }),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Wolfram Alpha',
          reason: 'wolfram_alpha_api_error',
          operation,
          detailKeys: ['msg', 'message', 'error', 'code']
        })
    );
  }

  private result(data: unknown, wrapper: string): Record<string, unknown> {
    if (!isApiErrorRecord(data))
      throw createApiServiceError('Wolfram Alpha returned an invalid structured response.');
    const result = isApiErrorRecord(data[wrapper]) ? data[wrapper] : data;
    if (result.error && result.error !== 'false') {
      const details = isApiErrorRecord(result.error) ? result.error : result;
      const message =
        typeof details.msg === 'string' ? details.msg : 'The query could not be processed.';
      throw createApiServiceError(`Wolfram Alpha API failed: ${message}`, {
        reason: 'wolfram_alpha_api_error',
        upstreamCode: details.code === undefined ? undefined : String(details.code)
      });
    }
    return result;
  }

  async fullResultsQuery(params: FullResultsParams): Promise<Record<string, unknown>> {
    this.validateLocation(params);
    if (params.significantDigits !== undefined) {
      throw createApiServiceError(
        'Wolfram Alpha does not provide a significantDigits parameter. Request a More digits pod state returned by an earlier query instead.'
      );
    }
    const query = this.query(params.input, {
      input: params.input,
      output: 'json',
      format: params.format,
      includepodid: [params.includePodId, ...(params.includePodIds ?? [])].filter(
        (value): value is string => value !== undefined
      ),
      excludepodid: [params.excludePodId, ...(params.excludePodIds ?? [])].filter(
        (value): value is string => value !== undefined
      ),
      podtitle: params.podTitle,
      podindex: params.podIndex,
      scanner: params.scanner,
      assumption: params.assumption,
      podstate: [params.podState, ...(params.podStates ?? [])].filter(
        (value): value is string => value !== undefined
      ),
      units: params.units === 'imperial' ? 'nonmetric' : params.units,
      ip: params.ip,
      latlong: params.latLong,
      location: params.location,
      scantimeout: params.timeout,
      maxwidth: params.maxWidth,
      reinterpret: params.reinterpret
    });
    return this.result(
      await this.request(
        'full results query',
        'https://api.wolframalpha.com/v2/query',
        query,
        'json'
      ),
      'queryresult'
    );
  }

  async shortAnswer(params: ShortAnswerParams): Promise<string> {
    return this.request(
      'short answer',
      'https://api.wolframalpha.com/v1/result',
      this.query(params.input, {
        i: params.input,
        units: params.units,
        timeout: params.timeout
      }),
      'text'
    );
  }

  async spokenResult(params: SpokenResultParams): Promise<string> {
    return this.request(
      'spoken result',
      'https://api.wolframalpha.com/v1/spoken',
      this.query(params.input, {
        i: params.input,
        units: params.units,
        timeout: params.timeout
      }),
      'text'
    );
  }

  async simpleImage(params: SimpleImageParams): Promise<string> {
    const foreground = params.foreground?.toLowerCase();
    const color =
      foreground === '000000' ? 'black' : foreground === 'ffffff' ? 'white' : foreground;
    if (color !== undefined && !['black', 'white'].includes(color)) {
      throw createApiServiceError(
        'The image foreground must be black or white (000000 or FFFFFF are also accepted).'
      );
    }
    const query = this.query(params.input, {
      i: params.input,
      layout: params.layout,
      background: params.background,
      foreground: color,
      fontsize: params.fontsize,
      width: params.width,
      units: params.units,
      timeout: params.timeout
    });
    return `https://api.wolframalpha.com/v1/simple?${query}`;
  }

  async llmQuery(params: LlmQueryParams): Promise<string> {
    this.validateLocation(params);
    return this.request(
      'LLM query',
      'https://www.wolframalpha.com/api/v1/llm-api',
      this.query(params.input, {
        input: params.input,
        maxchars: params.maxchars,
        units: params.units === 'imperial' ? 'nonmetric' : params.units,
        assumption: params.assumption,
        location: params.location,
        ip: params.ip,
        latlong: params.latLong
      }),
      'text'
    );
  }

  async validateQuery(params: ValidateQueryParams): Promise<Record<string, unknown>> {
    return this.result(
      await this.request(
        'validate query',
        'https://api.wolframalpha.com/v2/validatequery',
        this.query(params.input, {
          input: params.input,
          output: 'json'
        }),
        'json'
      ),
      'validatequeryresult'
    );
  }

  async fastQueryRecognizer(
    params: FastQueryRecognizerParams
  ): Promise<Record<string, unknown>> {
    return this.result(
      await this.request(
        'recognize query',
        'https://www.wolframalpha.com/queryrecognizer/query.jsp',
        this.query(params.input, {
          i: params.input,
          mode: params.mode ?? 'Default',
          output: 'json'
        }),
        'json'
      ),
      'queryrecognizer'
    );
  }
}
