import { createAxios } from 'slates';

export interface FullResultsParams {
  input: string;
  format?: string;
  includePodId?: string;
  excludePodId?: string;
  podTitle?: string;
  podIndex?: string;
  scanner?: string;
  assumption?: string | string[];
  podState?: string;
  units?: string;
  ip?: string;
  latLong?: string;
  location?: string;
  timeout?: number;
  maxWidth?: number;
  plotWidth?: number;
  mag?: number;
  reinterpret?: boolean;
  translation?: boolean;
  ignoreCase?: boolean;
  sig?: number;
  output?: 'xml' | 'json';
}

export interface ShortAnswerParams {
  input: string;
  units?: string;
  timeout?: number;
}

export interface SpokenResultParams {
  input: string;
  units?: string;
  timeout?: number;
}

export interface SimpleImageParams {
  input: string;
  layout?: string;
  background?: string;
  foreground?: string;
  fontsize?: number;
  width?: number;
  units?: string;
  timeout?: number;
}

export interface LlmQueryParams {
  input: string;
  maxchars?: number;
  units?: string;
}

export interface ValidateQueryParams {
  input: string;
}

export interface FastQueryRecognizerParams {
  input: string;
  mode?: 'Default' | 'Voice';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.wolframalpha.com'
    });
  }

  async fullResultsQuery(params: FullResultsParams): Promise<any> {
    let queryParams: Record<string, string | number | boolean> = {
      appid: this.token,
      input: params.input,
      output: params.output ?? 'json'
    };

    if (params.format) queryParams.format = params.format;
    if (params.includePodId) queryParams.includepodid = params.includePodId;
    if (params.excludePodId) queryParams.excludepodid = params.excludePodId;
    if (params.podTitle) queryParams.podtitle = params.podTitle;
    if (params.podIndex) queryParams.podindex = params.podIndex;
    if (params.scanner) queryParams.scanner = params.scanner;
    if (params.podState) queryParams.podstate = params.podState;
    if (params.units) queryParams.units = params.units;
    if (params.ip) queryParams.ip = params.ip;
    if (params.latLong) queryParams.latlong = params.latLong;
    if (params.location) queryParams.location = params.location;
    if (params.timeout != null) queryParams.scantimeout = params.timeout;
    if (params.maxWidth != null) queryParams.maxwidth = params.maxWidth;
    if (params.plotWidth != null) queryParams.plotwidth = params.plotWidth;
    if (params.mag != null) queryParams.mag = params.mag;
    if (params.reinterpret != null) queryParams.reinterpret = params.reinterpret;
    if (params.translation != null) queryParams.translation = params.translation;
    if (params.ignoreCase != null) queryParams.ignorecase = params.ignoreCase;
    if (params.sig != null) queryParams.sig = params.sig;

    // Handle assumption parameter
    if (params.assumption) {
      let assumptions = Array.isArray(params.assumption)
        ? params.assumption
        : [params.assumption];
      queryParams.assumption = assumptions.join('&assumption=');
    }

    let response = await this.axios.get('/v2/query', {
      params: queryParams
    });

    return response.data;
  }

  async shortAnswer(params: ShortAnswerParams): Promise<string> {
    let queryParams: Record<string, string | number> = {
      appid: this.token,
      i: params.input
    };

    if (params.units) queryParams.units = params.units;
    if (params.timeout != null) queryParams.timeout = params.timeout;

    let response = await this.axios.get('/v1/result', {
      params: queryParams
    });

    return response.data;
  }

  async spokenResult(params: SpokenResultParams): Promise<string> {
    let queryParams: Record<string, string | number> = {
      appid: this.token,
      i: params.input
    };

    if (params.units) queryParams.units = params.units;
    if (params.timeout != null) queryParams.timeout = params.timeout;

    let response = await this.axios.get('/v1/spoken', {
      params: queryParams
    });

    return response.data;
  }

  async simpleImage(params: SimpleImageParams): Promise<string> {
    let queryParams: Record<string, string | number> = {
      appid: this.token,
      i: params.input
    };

    if (params.layout) queryParams.layout = params.layout;
    if (params.background) queryParams.background = params.background;
    if (params.foreground) queryParams.foreground = params.foreground;
    if (params.fontsize != null) queryParams.fontsize = params.fontsize;
    if (params.width != null) queryParams.width = params.width;
    if (params.units) queryParams.units = params.units;
    if (params.timeout != null) queryParams.timeout = params.timeout;

    // Build URL manually since we return the image URL
    let url = new URL('https://api.wolframalpha.com/v1/simple');
    for (let [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  async llmQuery(params: LlmQueryParams): Promise<string> {
    let queryParams: Record<string, string | number> = {
      appid: this.token,
      input: params.input
    };

    if (params.maxchars != null) queryParams.maxchars = params.maxchars;
    if (params.units) queryParams.units = params.units;

    let response = await this.axios.get('/api/v1/llm-api', {
      params: queryParams
    });

    return response.data;
  }

  async validateQuery(params: ValidateQueryParams): Promise<any> {
    let queryParams: Record<string, string> = {
      appid: this.token,
      input: params.input,
      output: 'json'
    };

    let response = await this.axios.get('/v2/validatequery', {
      params: queryParams
    });

    return response.data;
  }

  async fastQueryRecognizer(params: FastQueryRecognizerParams): Promise<any> {
    let queryParams: Record<string, string> = {
      appid: this.token,
      i: params.input,
      output: 'json'
    };

    if (params.mode) queryParams.mode = params.mode;

    let response = await this.axios.get('/queryrecognizer/query.jsp', {
      params: queryParams
    });

    return response.data;
  }
}
