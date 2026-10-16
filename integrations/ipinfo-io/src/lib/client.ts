import { isIP } from 'node:net';
import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getApiErrorResponseWithBody,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

let abuseSchema = z
  .object({
    address: z.string().optional(),
    country: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    network: z.string().optional(),
    phone: z.string().optional()
  })
  .passthrough();

let carrierSchema = z
  .object({
    name: z.string().optional(),
    mcc: z.string().optional(),
    mnc: z.string().optional()
  })
  .passthrough();

let asSchema = z
  .object({
    asn: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    route: z.string().optional(),
    type: z.string().optional(),
    last_changed: z.string().optional()
  })
  .passthrough();

let ipSchema = z
  .object({
    ip: z.string(),
    hostname: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    loc: z.string().optional(),
    org: z.string().optional(),
    postal: z.string().optional(),
    timezone: z.string().optional(),
    geo: z
      .object({
        city: z.string().optional(),
        region: z.string().optional(),
        region_code: z.string().optional(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        continent: z.string().optional(),
        continent_code: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        timezone: z.string().optional(),
        postal_code: z.string().optional(),
        geoname_id: z.string().optional(),
        radius: z.number().optional(),
        last_changed: z.string().optional()
      })
      .passthrough()
      .optional(),
    as: asSchema.optional(),
    asn: asSchema.optional(),
    company: z
      .object({
        name: z.string().optional(),
        domain: z.string().optional(),
        type: z.string().optional()
      })
      .passthrough()
      .optional(),
    carrier: carrierSchema.optional(),
    mobile: carrierSchema.optional(),
    privacy: z
      .object({
        vpn: z.boolean().optional(),
        proxy: z.boolean().optional(),
        tor: z.boolean().optional(),
        relay: z.boolean().optional(),
        hosting: z.boolean().optional(),
        service: z.string().optional()
      })
      .passthrough()
      .optional(),
    anonymous: z
      .object({
        is_vpn: z.boolean().optional(),
        is_proxy: z.boolean().optional(),
        is_tor: z.boolean().optional(),
        is_relay: z.boolean().optional(),
        name: z.string().optional()
      })
      .passthrough()
      .optional(),
    abuse: abuseSchema.optional(),
    is_place: z.boolean().optional(),
    is_anonymous: z.boolean().optional(),
    is_anycast: z.boolean().optional(),
    is_hosting: z.boolean().optional(),
    is_mobile: z.boolean().optional(),
    is_satellite: z.boolean().optional()
  })
  .passthrough();

let liteSchema = z
  .object({
    ip: z.string(),
    asn: z.string().optional(),
    as_name: z.string().optional(),
    as_domain: z.string().optional(),
    country_code: z.string().optional(),
    country: z.string().optional(),
    continent_code: z.string().optional(),
    continent: z.string().optional()
  })
  .passthrough();

let prefixSchema = z
  .object({
    netblock: z.string(),
    id: z.string(),
    name: z.string(),
    country: z.string(),
    size: z.string().optional(),
    status: z.string().optional(),
    domain: z.string().optional(),
    rpki_status: z.string().optional()
  })
  .passthrough();

let asnSchema = z
  .object({
    asn: z.string(),
    name: z.string(),
    country: z.string(),
    allocated: z.string().optional(),
    registry: z.string().optional(),
    domain: z.string().optional(),
    num_ips: z.number().optional(),
    type: z.string().optional(),
    prefixes: z.array(prefixSchema).optional(),
    prefixes6: z.array(prefixSchema).optional(),
    peers: z.array(z.string()).optional(),
    upstreams: z.array(z.string()).optional(),
    downstreams: z.array(z.string()).optional()
  })
  .passthrough();

let rangesSchema = z
  .object({
    domain: z.string(),
    redirects_to: z.string().nullable().optional(),
    num_ranges: z.number(),
    ranges: z.array(z.string())
  })
  .passthrough();

let domainsSchema = z
  .object({
    ip: z.string(),
    total: z.number(),
    page: z.number().optional(),
    domains: z.array(z.string())
  })
  .passthrough();

export type IpDetails = z.infer<typeof ipSchema>;
export type LiteIpDetails = z.infer<typeof liteSchema>;
export type AsnDetails = z.infer<typeof asnSchema>;
export type AbuseContact = z.infer<typeof abuseSchema>;
export type IpRangesResponse = z.infer<typeof rangesSchema>;
export type HostedDomainsResponse = z.infer<typeof domainsSchema>;
export type BatchApi = 'lookup' | 'lite' | 'legacy';

export class Client {
  private axios;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('Provide your IPinfo API token.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.ipinfo.io',
      authHeader: { value: `Bearer ${token}` },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error => {
        if (error instanceof ServiceError) return error;
        let response = getApiErrorResponseWithBody(error);
        let message = extractApiErrorMessage(error, {
          response,
          detailKeys: ['title', 'message', 'detail', 'error', 'error_description', 'code'],
          nestedKeys: ['error', 'errors']
        });
        for (let secret of new Set([token, encodeURIComponent(token)])) {
          message = message.split(secret).join('[REDACTED]');
        }
        // Retain provider details without retaining the credential-bearing request or parent.
        return buildApiServiceError(
          {
            message,
            response: response ? { status: response.status, data: { message } } : undefined
          },
          {
            providerLabel: 'IPinfo',
            reason: 'ipinfo_api_error',
            extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
          }
        );
      }
    });
    this.axios.interceptors.response.use(response => {
      let data = response.data;
      if (
        isApiErrorRecord(data) &&
        isApiErrorRecord(data.error) &&
        (data.error.title || data.error.message)
      ) {
        let message = extractApiErrorMessage(
          { response: { data } },
          {
            detailKeys: ['title', 'message', 'detail'],
            nestedKeys: ['error', 'errors']
          }
        );
        for (let secret of new Set([token, encodeURIComponent(token)])) {
          message = message.split(secret).join('[REDACTED]');
        }
        throw createApiServiceError(`IPinfo could not complete the request: ${message}`);
      }
      return response;
    });
  }

  private ipSegment(ip?: string) {
    if (ip === undefined || ip === 'me') return 'me';
    let value = ip.trim();
    if (!isIP(value)) throw createApiServiceError('Provide a valid IPv4 or IPv6 address.');
    return encodeURIComponent(value);
  }

  private parseResponse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
    let result = schema.safeParse(data);
    if (!result.success) {
      let fields = result.error.issues.map(issue => issue.path.join('.')).join(', ');
      throw createApiServiceError(
        `IPinfo returned an invalid response. Check fields: ${fields}.`,
        {
          reason: 'ipinfo_invalid_response'
        }
      );
    }
    return result.data;
  }

  async getIpDetails(ip?: string, api: 'lookup' | 'legacy' = 'lookup'): Promise<IpDetails> {
    let segment = this.ipSegment(ip);
    let response =
      api === 'legacy'
        ? await this.axios.get(
            `https://ipinfo.io/${segment === 'me' ? '' : `${segment}/`}json`
          )
        : await this.axios.get(`/lookup/${segment}`);
    return this.parseResponse(ipSchema, response.data);
  }

  async getLiteIpDetails(ip?: string): Promise<LiteIpDetails> {
    let response = await this.axios.get(`/lite/${this.ipSegment(ip)}`);
    return this.parseResponse(liteSchema, response.data);
  }

  async getAsnDetails(asn: string): Promise<AsnDetails> {
    let number = /^(?:AS)?(\d+)$/i.exec(asn.trim())?.[1];
    if (!number || BigInt(number) > 4_294_967_295n) {
      throw createApiServiceError('Provide an ASN such as AS15169 or 15169.');
    }
    let response = await this.axios.get(`https://ipinfo.io/AS${number}/json`);
    return this.parseResponse(asnSchema, response.data);
  }

  async getAbuseContact(ip: string): Promise<AbuseContact> {
    let response = await this.axios.get(`https://ipinfo.io/${this.ipSegment(ip)}/abuse`);
    return this.parseResponse(abuseSchema, response.data);
  }

  async getIpRanges(domain: string): Promise<IpRangesResponse> {
    let value = domain.trim();
    if (!value || /[/\\?#@\s:]/.test(value) || value.split('.').some(label => !label)) {
      throw createApiServiceError(
        'Provide a domain name such as google.com, without a URL or path.'
      );
    }
    let response = await this.axios.get(
      `https://ipinfo.io/ranges/${encodeURIComponent(value)}`
    );
    return this.parseResponse(rangesSchema, response.data);
  }

  async getHostedDomains(
    ip: string,
    options?: { page?: number; limit?: number }
  ): Promise<HostedDomainsResponse> {
    if (options?.page !== undefined && (!Number.isInteger(options.page) || options.page < 0)) {
      throw createApiServiceError('Page must be a nonnegative integer starting at 0.');
    }
    if (
      options?.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 1000)
    ) {
      throw createApiServiceError('Limit must be an integer from 1 through 1000.');
    }
    let response = await this.axios.get(`https://ipinfo.io/domains/${this.ipSegment(ip)}`, {
      params: { page: options?.page, limit: options?.limit }
    });
    return this.parseResponse(domainsSchema, response.data);
  }

  async batchLookup(
    queries: string[],
    options?: { api?: BatchApi; filter?: boolean }
  ): Promise<Record<string, unknown>> {
    if (!queries.length || queries.length > 1000 || queries.some(query => !query.trim())) {
      throw createApiServiceError(
        'Provide between 1 and 1000 nonempty IP addresses or query patterns.'
      );
    }
    let api = options?.api ?? 'lookup';
    let path = api === 'lookup' ? '/batch' : `/batch/${api}`;
    let response = await this.axios.post(path, queries, {
      params: { filter: options?.filter === undefined ? undefined : options.filter ? 1 : 0 }
    });
    return this.parseResponse(z.record(z.string(), z.unknown()), response.data);
  }
}
