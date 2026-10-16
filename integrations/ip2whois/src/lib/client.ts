import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

let contactResponseSchema = z.object({
  name: z.string(),
  organization: z.string(),
  street_address: z.string(),
  city: z.string(),
  region: z.string(),
  zip_code: z.string(),
  country: z.string(),
  phone: z.string(),
  fax: z.string(),
  email: z.string()
});

let whoisResponseSchema = z.object({
  domain: z.string(),
  domain_id: z.string(),
  status: z.string(),
  create_date: z.string(),
  update_date: z.string(),
  expire_date: z.string(),
  domain_age: z.number(),
  whois_server: z.string(),
  registrar: z.object({ iana_id: z.string(), name: z.string(), url: z.string() }),
  registrant: contactResponseSchema,
  admin: contactResponseSchema,
  tech: contactResponseSchema,
  billing: contactResponseSchema,
  nameservers: z.array(z.string())
});

let hostedDomainsResponseSchema = z.object({
  ip: z.string(),
  total_domains: z.number(),
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number(),
  domains: z.array(z.string())
});

let apiError = (error: unknown, operation: string, token: string) => {
  let encodedToken = new URLSearchParams({ key: token }).toString().slice(4);
  let redact = (value: string) =>
    value.split(token).join('[REDACTED]').split(encodedToken).join('[REDACTED]');

  return buildApiServiceError(error, {
    providerLabel: 'IP2WHOIS',
    reason: 'ip2whois_api_error',
    operation,
    detailKeys: ['error_message', 'message', 'error_code', 'code'],
    nestedKeys: ['error', 'errors'],
    // Query credentials may remain in normalized error messages and diagnostic parents.
    parent: false,
    formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
      redact(`${providerLabel} API ${operation} failed: ${statusLabel}${message}`),
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      let details =
        isApiErrorRecord(data) && isApiErrorRecord(data.error) ? data.error : undefined;
      let code = details?.error_code;
      return typeof code === 'number' || typeof code === 'string'
        ? redact(String(code))
        : undefined;
    }
  });
};

let readResponse = <T>(
  data: unknown,
  schema: z.ZodType<T>,
  operation: string,
  token: string
): T => {
  if (isApiErrorRecord(data) && data.error !== undefined && data.error !== null) {
    throw apiError({ response: { data } }, operation, token);
  }

  let result = schema.safeParse(data);
  if (!result.success) {
    let fields = result.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw createApiServiceError(
      `IP2WHOIS returned an unexpected ${operation} response. Invalid or missing fields: ${fields || 'response'}.`,
      { reason: 'ip2whois_invalid_response' }
    );
  }
  return result.data;
};

export interface WhoisContact {
  name: string;
  organization: string;
  streetAddress: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
}

export interface WhoisRegistrar {
  ianaId: string;
  name: string;
  url: string;
}

export interface WhoisResult {
  domain: string;
  domainId: string;
  status: string;
  createDate: string;
  updateDate: string;
  expireDate: string;
  domainAge: number;
  whoisServer: string;
  registrar: WhoisRegistrar;
  registrant: WhoisContact;
  admin: WhoisContact;
  tech: WhoisContact;
  billing: WhoisContact;
  nameservers: string[];
}

export interface HostedDomainsResult {
  ip: string;
  totalDomains: number;
  page: number;
  perPage: number;
  totalPages: number;
  domains: string[];
}

let mapContact = (raw: z.infer<typeof contactResponseSchema>): WhoisContact => ({
  name: raw.name,
  organization: raw.organization,
  streetAddress: raw.street_address,
  city: raw.city,
  region: raw.region,
  zipCode: raw.zip_code,
  country: raw.country,
  phone: raw.phone,
  fax: raw.fax,
  email: raw.email
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Connect an IP2WHOIS API key before running a lookup.', {
        reason: 'ip2whois_api_key_required'
      });
    }
    this.token = config.token;
  }

  async lookupWhois(domain: string): Promise<WhoisResult> {
    let axios = createAuthenticatedAxios({
      baseURL: 'https://api.ip2whois.com',
      contentType: false,
      timeout: 30000,
      errorAdapter: error => apiError(error, 'WHOIS lookup', this.token)
    });

    let response = await axios.get('/v2', {
      params: {
        key: this.token,
        domain,
        format: 'json'
      }
    });

    let data = readResponse(response.data, whoisResponseSchema, 'WHOIS lookup', this.token);

    return {
      domain: data.domain,
      domainId: data.domain_id,
      status: data.status,
      createDate: data.create_date,
      updateDate: data.update_date,
      expireDate: data.expire_date,
      domainAge: data.domain_age,
      whoisServer: data.whois_server,
      registrar: {
        ianaId: data.registrar.iana_id,
        name: data.registrar.name,
        url: data.registrar.url
      },
      registrant: mapContact(data.registrant),
      admin: mapContact(data.admin),
      tech: mapContact(data.tech),
      billing: mapContact(data.billing),
      nameservers: data.nameservers
    };
  }

  async lookupHostedDomains(ip: string, page?: number): Promise<HostedDomainsResult> {
    if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
      throw createApiServiceError('Page must be a positive whole number.', {
        reason: 'ip2whois_invalid_page'
      });
    }
    let axios = createAuthenticatedAxios({
      baseURL: 'https://domains.ip2whois.com',
      contentType: false,
      timeout: 30000,
      errorAdapter: error => apiError(error, 'hosted domain lookup', this.token)
    });

    let params: Record<string, string | number> = {
      key: this.token,
      ip,
      format: 'json'
    };

    if (page !== undefined) {
      params.page = page;
    }

    let response = await axios.get('/domains', {
      params
    });

    let data = readResponse(
      response.data,
      hostedDomainsResponseSchema,
      'hosted domain lookup',
      this.token
    );

    return {
      ip: data.ip,
      totalDomains: data.total_domains,
      page: data.page,
      perPage: data.per_page,
      totalPages: data.total_pages,
      domains: data.domains
    };
  }
}
