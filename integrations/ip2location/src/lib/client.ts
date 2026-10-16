import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

let geolocationApi = createAxios({ baseURL: 'https://api.ip2location.io', timeout: 30000 });
let bulkApi = createAxios({ baseURL: 'https://bulk.ip2location.io', timeout: 60000 });
let whoisApi = createAxios({ baseURL: 'https://api.ip2whois.com/v2', timeout: 30000 });
let hostedDomainsApi = createAxios({
  baseURL: 'https://domains.ip2whois.com',
  timeout: 30000
});

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'IP2Location',
    reason: 'ip2location_api_error',
    operation,
    detailKeys: ['error_message', 'message', 'error_code', 'code'],
    nestedKeys: ['error', 'errors'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_value, response) => {
      let body = response?.data;
      let details =
        isApiErrorRecord(body) && isApiErrorRecord(body.error) ? body.error : undefined;
      let code = details?.error_code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let checkProviderError = (data: unknown, operation: string) => {
  if (isApiErrorRecord(data) && data.error !== undefined && data.error !== null) {
    throw apiError({ response: { data } }, operation);
  }
};

let ipAddress = (value: string) => {
  let ip = value.trim();
  if (!isIP(ip)) {
    throw createApiServiceError('Provide a valid IPv4 or IPv6 address.', {
      reason: 'invalid_ip_address'
    });
  }
  return ip;
};

export class Client {
  private token?: string;

  constructor(config: { token?: string }) {
    this.token = config.token?.trim() || undefined;
  }

  private headers(requireKey = false) {
    if (requireKey && !this.token) {
      throw createApiServiceError(
        'Connect an API key to use this lookup. Keyless access supports only single-IP geolocation.',
        {
          reason: 'api_key_required'
        }
      );
    }
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async request(
    operation: string,
    send: () => ReturnType<typeof geolocationApi.get<unknown>>
  ) {
    let data = await requestAxiosData<unknown>(operation, send, apiError);
    checkProviderError(data, operation);
    return data;
  }

  async getGeolocation(ip: string, language?: string) {
    let params: Record<string, string> = { ip: ipAddress(ip), format: 'json' };
    if (language && language !== 'en') params.lang = language;
    return this.request('geolocation lookup', () =>
      geolocationApi.get('/', {
        headers: this.headers(),
        params
      })
    );
  }

  async getBulkGeolocation(ips: string[]) {
    let addresses = ips.map(ipAddress);
    return this.request('bulk geolocation lookup', () =>
      bulkApi.post('/', addresses.join('\n'), {
        headers: { ...this.headers(true), 'Content-Type': 'text/plain' },
        params: { format: 'json' }
      })
    );
  }

  async getWhois(domain: string) {
    let asciiDomain = domainToASCII(domain.trim());
    if (
      !asciiDomain ||
      asciiDomain.length > 253 ||
      !asciiDomain.includes('.') ||
      asciiDomain
        .split('.')
        .some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    ) {
      throw createApiServiceError(
        'Provide a domain name such as example.com, without a URL scheme or path.',
        {
          reason: 'invalid_domain_name'
        }
      );
    }
    return this.request('domain WHOIS lookup', () =>
      whoisApi.get('/', {
        headers: this.headers(true),
        params: { domain: asciiDomain, format: 'json' }
      })
    );
  }

  async getHostedDomains(ip: string, page = 1) {
    if (!Number.isInteger(page) || page < 1) {
      throw createApiServiceError('Page must be a positive whole number.', {
        reason: 'invalid_page'
      });
    }
    let params = { ip: ipAddress(ip), page, format: 'json' };
    return this.request('hosted domain lookup', () =>
      hostedDomainsApi.get('/domains', {
        headers: this.headers(true),
        params
      })
    );
  }
}
