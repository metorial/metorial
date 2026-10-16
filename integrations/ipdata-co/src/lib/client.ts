import { isIP } from 'node:net';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

export interface IpdataClientConfig {
  token: string;
  useEuEndpoint: boolean;
}

export interface IpLookupResult {
  ip: string;
  city?: string;
  region?: string;
  countryName?: string;
  threat?: Record<string, unknown>;
  raw: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AsnPrefix {
  prefix: string;
  ip: string;
  cidr: number;
  asn: string;
}

export interface AsnDetailResult {
  asn: string;
  name: string;
  domain: string;
  route?: string;
  type: string;
  countryCode?: string;
  prefixes: AsnPrefix[];
  prefixes6: AsnPrefix[];
  ipv4Prefixes: string[];
  ipv6Prefixes: string[];
  raw: Record<string, unknown>;
  [key: string]: unknown;
}

let normalizeKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeKeys);
  if (!isApiErrorRecord(value)) return value;
  let result: Record<string, unknown> = {};
  for (let [key, entry] of Object.entries(value)) {
    if (entry === null) continue;
    let normalized = normalizeKeys(entry);
    if (isApiErrorRecord(normalized) && Object.keys(normalized).length === 0) continue;
    let camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = normalized;
  }
  return result;
};

let invalidResponse = (message: string) =>
  createApiServiceError(`Ipdata.co returned an invalid response: ${message}`, {
    reason: 'invalid_provider_response'
  });

let requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') throw invalidResponse(`${field} must be a string.`);
  return value;
};

let requireRecord = (value: unknown): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) throw invalidResponse('Expected a JSON object.');
  return value;
};

let mapLookup = (value: unknown): IpLookupResult => {
  let raw = requireRecord(value);
  let result = requireRecord(normalizeKeys(raw));
  if (result.asn === '') result.asn = undefined;
  return {
    ...result,
    ip: requireString(result.ip, 'ip'),
    postalCode: result.postal,
    timezone: result.timeZone,
    raw
  };
};

let validateIp = (ip: string) => {
  if (!isIP(ip)) {
    throw createApiServiceError('Provide a valid IPv4 or IPv6 address.', {
      reason: 'invalid_ip_address'
    });
  }
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: IpdataClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide an Ipdata.co API key.', {
        reason: 'missing_api_key'
      });
    }
    this.token = config.token;
    this.axios = createAxios({
      baseURL: config.useEuEndpoint ? 'https://eu-api.ipdata.co' : 'https://api.ipdata.co'
    });
  }

  private buildParams(fields?: string[]): Record<string, string> {
    let params: Record<string, string> = { 'api-key': this.token };
    if (fields?.length) {
      if (fields.some(field => !field.trim())) {
        throw createApiServiceError('Response field names cannot be empty.', {
          reason: 'invalid_response_fields'
        });
      }
      // Every existing lookup result requires the provider's actual IP address.
      params.fields = [...new Set(['ip', ...fields])].join(',');
    }
    return params;
  }

  private async request(path: string, fields?: string[], ips?: string[]): Promise<unknown> {
    try {
      let params = this.buildParams(fields);
      let response = ips
        ? await this.axios.post(path, ips, {
            params,
            headers: { 'Content-Type': 'application/json' }
          })
        : await this.axios.get(path, { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Ipdata.co',
        reason: 'ipdata_api_error',
        operation: ips ? 'bulk lookup' : 'lookup',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  async lookupIp(ip?: string, fields?: string[]): Promise<IpLookupResult> {
    if (ip !== undefined) validateIp(ip);
    return mapLookup(
      await this.request(ip === undefined ? '/' : `/${encodeURIComponent(ip)}`, fields)
    );
  }

  async bulkLookup(ips: string[], fields?: string[]): Promise<IpLookupResult[]> {
    if (ips.length < 1 || ips.length > 100) {
      throw createApiServiceError('Provide between 1 and 100 IP addresses.', {
        reason: 'invalid_bulk_size'
      });
    }
    for (let ip of ips) validateIp(ip);
    let response = await this.request('/bulk', fields, ips);
    if (!Array.isArray(response)) throw invalidResponse('Expected a JSON array.');
    return response.map(mapLookup);
  }

  async lookupAsn(asn: string): Promise<AsnDetailResult> {
    if (!/^AS[1-9]\d*$/i.test(asn) || Number(asn.slice(2)) > 4_294_967_295) {
      throw createApiServiceError('Provide an ASN such as AS13335 (1–4294967295).', {
        reason: 'invalid_asn'
      });
    }
    let requestedAsn = asn.toUpperCase();
    let raw = requireRecord(await this.request(`/${requestedAsn}/`));
    let result = requireRecord(normalizeKeys(raw));
    let mapPrefixes = (value: unknown, version: number): AsnPrefix[] => {
      if (!Array.isArray(value))
        throw invalidResponse(`ipv${version}_prefixes must be an array.`);
      return value.map(entry => {
        let prefix = requireString(entry, `ipv${version}_prefixes entry`);
        let [ip, mask] = prefix.split('/');
        let cidr = Number(mask);
        if (
          !ip ||
          isIP(ip) !== version ||
          !mask ||
          !Number.isInteger(cidr) ||
          cidr < 0 ||
          cidr > (version === 4 ? 32 : 128)
        ) {
          throw invalidResponse(`Invalid IPv${version} network prefix.`);
        }
        return { prefix, ip, cidr, asn: requestedAsn };
      });
    };
    let prefixes = mapPrefixes(result.ipv4Prefixes, 4);
    let prefixes6 = mapPrefixes(result.ipv6Prefixes, 6);
    return {
      ...result,
      asn: requestedAsn,
      name: requireString(result.name, 'name'),
      domain: requireString(result.domain, 'domain'),
      route: typeof result.route === 'string' ? result.route : undefined,
      type: requireString(result.usage, 'usage'),
      countryCode: typeof result.country === 'string' ? result.country : undefined,
      prefixes,
      prefixes6,
      ipv4Prefixes: prefixes.map(prefix => prefix.prefix),
      ipv6Prefixes: prefixes6.map(prefix => prefix.prefix),
      raw
    };
  }

  async getUsage(): Promise<{ count: string; raw: Record<string, unknown> }> {
    let raw = requireRecord(await this.request('/', ['count']));
    return { count: requireString(raw.count, 'count'), raw };
  }
}
