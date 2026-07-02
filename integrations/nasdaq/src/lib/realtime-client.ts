import { createAxios } from 'slates';

export interface RealtimeClientConfig {
  baseUrl: string;
  oauthToken: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  oauthTokenExpiresAt: string;
}

export interface LastSaleParams {
  symbols: string[];
  source?: 'Nasdaq' | 'BX' | 'PSX' | 'CQT';
  offset?: 'realtime' | 'delayed';
}

export interface BarsParams {
  symbols: string[];
  source?: 'Nasdaq' | 'CQT';
  offset?: 'realtime' | 'delayed';
  barPrecision?:
    | '1minute'
    | '5minute'
    | '10minute'
    | '15minute'
    | '30minute'
    | '1day'
    | '1week'
    | '1month';
  dateRange?: '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y' | 'max' | 'ytd';
  adjusted?: boolean;
}

export interface SnapshotParams {
  symbols: string[];
  source?: 'Nasdaq' | 'BX' | 'PSX' | 'CQT';
  offset?: 'realtime' | 'delayed';
}

export interface OptionsChainParams {
  symbol: string;
  source?: 'Nasdaq';
  offset?: 'realtime' | 'delayed';
}

export interface IndexParams {
  symbols?: string[];
}

export class RealtimeClient {
  private config: RealtimeClientConfig;
  private currentToken: string;
  private tokenExpiresAt: string;

  constructor(config: RealtimeClientConfig) {
    this.config = config;
    this.currentToken = config.oauthToken;
    this.tokenExpiresAt = config.oauthTokenExpiresAt;
  }

  private async ensureValidToken(): Promise<string> {
    let expiresAt = new Date(this.tokenExpiresAt).getTime();
    let now = Date.now();
    let bufferMs = 60 * 1000; // 1 minute buffer

    if (now + bufferMs < expiresAt) {
      return this.currentToken;
    }

    let http = createAxios();
    let params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.config.clientId);
    params.append('client_secret', this.config.clientSecret);

    let response = await http.post(this.config.tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.currentToken = response.data.access_token;
    this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

    return this.currentToken;
  }

  private async request(path: string, params?: Record<string, string>): Promise<any> {
    let token = await this.ensureValidToken();
    let http = createAxios({
      baseURL: this.config.baseUrl
    });

    let response = await http.get(`/v1${path}`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  }

  async getLastSale(params: LastSaleParams): Promise<any> {
    let queryParams: Record<string, string> = {
      symbols: params.symbols.join(',')
    };
    if (params.source) queryParams.source = params.source;
    if (params.offset) queryParams.offset = params.offset;

    return this.request('/lastsale', queryParams);
  }

  async getLastTrade(params: LastSaleParams): Promise<any> {
    let queryParams: Record<string, string> = {
      symbols: params.symbols.join(',')
    };
    if (params.source) queryParams.source = params.source;
    if (params.offset) queryParams.offset = params.offset;

    return this.request('/lasttrade', queryParams);
  }

  async getLastQuote(params: LastSaleParams): Promise<any> {
    let queryParams: Record<string, string> = {
      symbols: params.symbols.join(',')
    };
    if (params.source) queryParams.source = params.source;
    if (params.offset) queryParams.offset = params.offset;

    return this.request('/lastquote', queryParams);
  }

  async getSnapshot(params: SnapshotParams): Promise<any> {
    let queryParams: Record<string, string> = {
      symbols: params.symbols.join(',')
    };
    if (params.source) queryParams.source = params.source;
    if (params.offset) queryParams.offset = params.offset;

    return this.request('/snapshot', queryParams);
  }

  async getBars(params: BarsParams): Promise<any> {
    let queryParams: Record<string, string> = {
      symbols: params.symbols.join(',')
    };
    if (params.source) queryParams.source = params.source;
    if (params.offset) queryParams.offset = params.offset;
    if (params.barPrecision) queryParams.barPrecision = params.barPrecision;
    if (params.dateRange) queryParams.dateRange = params.dateRange;
    if (params.adjusted !== undefined) queryParams.adjusted = String(params.adjusted);

    // Use bars-all for Nasdaq/CQT sources (which support 10+ year history)
    let endpoint =
      params.source === 'Nasdaq' || params.source === 'CQT' || !params.source
        ? '/bars-all'
        : '/bars';
    return this.request(endpoint, queryParams);
  }

  async getTrends(params?: { source?: string; offset?: string }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.source) queryParams.source = params.source;
    if (params?.offset) queryParams.offset = params.offset;

    return this.request('/trends', queryParams);
  }

  async getOptionsChain(params: OptionsChainParams): Promise<any> {
    let queryParams: Record<string, string> = {
      symbol: params.symbol
    };
    if (params.source) queryParams.source = params.source;
    if (params.offset) queryParams.offset = params.offset;

    return this.request('/chain', queryParams);
  }

  async getOptionPrices(params: { symbols: string[] }): Promise<any> {
    return this.request('/prices', { symbols: params.symbols.join(',') });
  }

  async getGreeksAndVols(params: { symbols: string[] }): Promise<any> {
    return this.request('/greeksandvols', { symbols: params.symbols.join(',') });
  }

  async getSymbols(): Promise<any> {
    return this.request('/symbols');
  }

  async getSymbol(symbol: string): Promise<any> {
    return this.request('/symbol', { symbol });
  }

  async getIndexes(): Promise<any> {
    return this.request('/indexes');
  }

  async getIndexValue(params: IndexParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.symbols) queryParams.symbols = params.symbols.join(',');
    return this.request('/indexvalue', queryParams);
  }

  async getIndexSnapshot(params: IndexParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.symbols) queryParams.symbols = params.symbols.join(',');
    return this.request('/indexsnapshot', queryParams);
  }
}
