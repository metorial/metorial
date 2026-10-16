import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { createNasdaqHttp, encodeCode, parseResponse, validateHttpsUrl } from './http';
import { requestAccessToken } from './token';

export interface RealtimeClientConfig {
  baseUrl: string;
  oauthToken: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  oauthTokenExpiresAt?: string;
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
}
export interface OptionsChainParams {
  symbol: string;
  source?: 'Nasdaq';
  offset?: 'realtime' | 'delayed';
}
let recordSchema = z.record(z.string(), z.unknown());
export let realtimeRecords = (data: unknown, label: string) => {
  let result = parseResponse(z.union([z.array(recordSchema), recordSchema]), data, label);
  return Array.isArray(result) ? result : [result];
};
let symbolPath = (symbols: string[]) => {
  if (!symbols.length || symbols.some(symbol => !symbol.trim() || symbol.includes(','))) {
    throw createApiServiceError(
      'Provide at least one non-empty symbol, with one symbol per array entry.'
    );
  }
  return symbols.map(symbol => encodeCode(symbol, 'Symbol')).join(',');
};
let marketPath = (params: { source?: string; offset?: string }) =>
  `${(params.source ?? 'Nasdaq').toLowerCase()}/${params.offset ?? 'realtime'}`;

export let createRealtimeClient = (auth: {
  authMethod: 'api_key' | 'oauth';
  baseUrl?: string;
  oauthToken?: string;
  oauthTokenExpiresAt?: string;
  tokenEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
}) => {
  if (
    auth.authMethod !== 'oauth' ||
    !auth.baseUrl ||
    !auth.oauthToken ||
    !auth.tokenEndpoint ||
    !auth.clientId ||
    !auth.clientSecret
  ) {
    throw createApiServiceError(
      'This tool requires an OAuth2 Client Credentials connection to the Nasdaq Cloud REST API.'
    );
  }
  return new RealtimeClient({
    baseUrl: auth.baseUrl,
    oauthToken: auth.oauthToken,
    tokenEndpoint: auth.tokenEndpoint,
    clientId: auth.clientId,
    clientSecret: auth.clientSecret,
    oauthTokenExpiresAt: auth.oauthTokenExpiresAt
  });
};

export class RealtimeClient {
  private currentToken: string;
  private tokenExpiresAt?: string;
  private http;

  constructor(private config: RealtimeClientConfig) {
    this.currentToken = config.oauthToken;
    this.tokenExpiresAt = config.oauthTokenExpiresAt;
    this.http = createNasdaqHttp(validateHttpsUrl(config.baseUrl, 'API base URL'));
  }

  private async ensureValidToken() {
    let expiry = Date.parse(this.tokenExpiresAt ?? '');
    if (!this.currentToken || !Number.isFinite(expiry) || Date.now() + 60_000 >= expiry) {
      let result = await requestAccessToken(this.config);
      this.currentToken = result.token;
      this.tokenExpiresAt = result.expiresAt;
    }
    return this.currentToken;
  }

  private async request(path: string): Promise<unknown> {
    let token = await this.ensureValidToken();
    let response = await this.http.get(path, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  getLastSale(params: LastSaleParams) {
    return this.request(
      `/v1/${marketPath(params)}/equities/lastsale/${symbolPath(params.symbols)}`
    );
  }
  getLastTrade(params: LastSaleParams) {
    return this.request(
      `/v1/${marketPath(params)}/equities/lasttrade/${symbolPath(params.symbols)}`
    );
  }
  getLastQuote(params: LastSaleParams) {
    return this.request(
      `/v1/${marketPath(params)}/equities/lastquote/${symbolPath(params.symbols)}`
    );
  }
  getSnapshot(params: LastSaleParams) {
    return this.request(
      `/v1/${marketPath(params)}/equities/snapshot/${symbolPath(params.symbols)}`
    );
  }
  getBars(params: BarsParams) {
    let precision = params.barPrecision ?? '1day';
    let range = params.dateRange ?? '1m';
    let supported: Record<string, string[]> = {
      '1d': ['1minute', '5minute'],
      '5d': ['5minute', '10minute', '15minute', '30minute'],
      '1m': ['1day'],
      '3m': ['1day'],
      '6m': ['1day'],
      '1y': ['1day', '1week'],
      '5y': ['1week', '1month'],
      max: ['1week', '1month'],
      ytd: ['1day']
    };
    if (!supported[range]?.includes(precision)) {
      throw createApiServiceError(
        `The bar interval ${precision} is unsupported for ${range}. Use one of: ${supported[range]?.join(', ')}.`
      );
    }
    return this.request(
      `/v2/${marketPath(params)}/equities/bars/${symbolPath(params.symbols)}/${precision}/false/${range}`
    );
  }
  async getTrends(params: { source?: string; offset?: string } = {}) {
    let data = await this.request(`/v1/${marketPath(params)}/equities/trends`);
    return parseResponse(recordSchema, data, 'market trends');
  }
  getOptionsChain(params: OptionsChainParams) {
    return this.request(
      `/v1/nasdaq/${params.offset ?? 'realtime'}/options/chain/${encodeCode(params.symbol, 'Underlying symbol')}`
    );
  }
  getOptionGreeks(identifier: string, offset: 'realtime' | 'delayed' = 'realtime') {
    if (offset === 'delayed')
      throw createApiServiceError(
        'Nasdaq currently offers option Greeks only in real time. Use offset realtime or disable includeGreeks.'
      );
    return this.request(
      `/v1/nasdaq/realtime/greeksandvolsus/${encodeCode(identifier, 'Option contract identifier')}`
    );
  }
  getSymbols() {
    return this.request('/v1/reference/symbols');
  }
  getSymbol(symbol: string) {
    return this.request(`/v1/reference/symbol/${encodeCode(symbol, 'Symbol')}`);
  }
  getIndexes() {
    return this.request('/v1/reference/indexes');
  }
  getIndexData(params: {
    instruments: string[];
    dataType: 'value' | 'snapshot';
    offset?: 'realtime' | 'delayed';
  }) {
    return this.request(
      `/v1/nasdaq/${params.offset ?? 'realtime'}/indexes/${params.dataType}/${symbolPath(params.instruments)}`
    );
  }
}
