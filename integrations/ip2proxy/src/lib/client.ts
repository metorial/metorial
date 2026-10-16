import { isIP } from 'node:net';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  decodeApiErrorBody,
  isApiErrorRecord
} from 'slates';

let xmlParser = new XMLParser({ parseTagValue: false, trimValues: false });

export interface ProxyLookupParams {
  ip?: string;
  package?: string;
  format?: string;
}

export interface ProxyLookupResponse {
  response: string;
  countryCode?: string;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  isp?: string;
  domain?: string;
  usageType?: string;
  asn?: string;
  as?: string;
  lastSeen?: string;
  threat?: string;
  proxyType?: string;
  isProxy: string;
  provider?: string;
  creditsConsumed?: number;
}

export interface CreditBalanceResponse {
  response: string;
  credits: string;
}

let malformedResponse = (field: string) =>
  createApiServiceError(`IP2Proxy returned an invalid or missing ${field}.`, {
    reason: 'invalid_response'
  });

let readString = (
  data: Record<string, unknown>,
  field: string,
  numeric = false
): string | undefined => {
  let value = data[field];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (numeric && typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw malformedResponse(field);
};

let readRequiredString = (data: Record<string, unknown>, field: string, numeric = false) => {
  let value = readString(data, field, numeric);
  if (value === undefined || !value.trim()) throw malformedResponse(field);
  return value;
};

let parseResponse = (body: unknown, operation: string): Record<string, unknown> => {
  let data = decodeApiErrorBody(body);
  if (typeof data === 'string' && data.trimStart().startsWith('<')) {
    // The API only returns scalar result fields; declarations are unnecessary.
    if (/<!DOCTYPE|<!ENTITY/i.test(data) || XMLValidator.validate(data) !== true) {
      throw malformedResponse('XML response');
    }
    let parsed: unknown = xmlParser.parse(data);
    data = isApiErrorRecord(parsed) ? parsed.result : undefined;
  }
  if (!isApiErrorRecord(data)) throw malformedResponse('response body');

  let status = readRequiredString(data, 'response');
  if (status !== 'OK') {
    throw createApiServiceError(`IP2Proxy API ${operation} failed: ${status}`, {
      reason: 'api_error',
      upstreamStatus: 200,
      upstreamCode: status
    });
  }
  return data;
};

export class Client {
  private axios = createAxios({ baseURL: 'https://api.ip2proxy.com', timeout: 30_000 });

  constructor(private config: { token: string }) {}

  private async request(params: Record<string, string>, operation: string) {
    if (!this.config.token.trim()) {
      throw createApiServiceError('An IP2Proxy API key is required.', {
        reason: 'missing_auth'
      });
    }
    try {
      let response = await this.axios.get<unknown>('/', {
        params: { ...params, key: this.config.token }
      });
      return parseResponse(response.data, operation);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'IP2Proxy',
        reason: 'api_error',
        operation,
        detailKeys: ['response', 'message', 'error', 'code'],
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  async lookupProxy(params: ProxyLookupParams): Promise<ProxyLookupResponse> {
    if (params.ip !== undefined && !isIP(params.ip)) {
      throw createApiServiceError(
        'Provide a valid IPv4 or IPv6 address, or omit the address.',
        {
          reason: 'invalid_ip_address'
        }
      );
    }
    let queryParams: Record<string, string> = { format: params.format || 'json' };
    if (params.ip !== undefined) queryParams.ip = params.ip;
    if (params.package) queryParams.package = params.package;

    let data = await this.request(queryParams, 'proxy lookup');
    let creditsConsumed = data.creditsConsumed;
    if (typeof creditsConsumed === 'string' && /^\d+$/.test(creditsConsumed)) {
      creditsConsumed = Number(creditsConsumed);
    }
    if (
      creditsConsumed !== undefined &&
      (typeof creditsConsumed !== 'number' ||
        !Number.isFinite(creditsConsumed) ||
        creditsConsumed < 0)
    ) {
      throw malformedResponse('creditsConsumed');
    }

    return {
      response: readRequiredString(data, 'response'),
      isProxy: readRequiredString(data, 'isProxy'),
      proxyType: readString(data, 'proxyType'),
      countryCode: readString(data, 'countryCode'),
      countryName: readString(data, 'countryName'),
      regionName: readString(data, 'regionName'),
      cityName: readString(data, 'cityName'),
      isp: readString(data, 'isp'),
      domain: readString(data, 'domain'),
      usageType: readString(data, 'usageType'),
      asn: readString(data, 'asn'),
      as: readString(data, 'as'),
      lastSeen: readString(data, 'lastSeen', true),
      threat: readString(data, 'threat'),
      provider: readString(data, 'provider'),
      creditsConsumed
    };
  }

  async checkCredits(): Promise<CreditBalanceResponse> {
    let data = await this.request({ check: '1', format: 'json' }, 'credit balance check');
    return {
      response: readRequiredString(data, 'response'),
      credits: readRequiredString(data, 'credits', true)
    };
  }
}
