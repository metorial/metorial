import { isIP } from 'node:net';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import {
  type Company,
  companySchema,
  type IpCompanyResponse,
  ipCompanyResponseSchema
} from './types';

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'BigPicture.io',
    reason: 'bigpicture_api_error',
    operation,
    detailKeys: ['message', 'type'],
    nestedKeys: ['error'],
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractUpstreamCode: (_input, response, helpers) => {
      let body = response?.data;
      return helpers.isRecord(body) &&
        helpers.isRecord(body.error) &&
        typeof body.error.type === 'string'
        ? body.error.type
        : undefined;
    }
  });

export class Client {
  private companyHttp;
  private ipHttp;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('A BigPicture.io API key is required.');
    }

    let options = {
      authHeader: { value: token },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      validateStatus: (status: number) => (status >= 200 && status < 300) || status === 404
    };
    this.companyHttp = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://company.bigpicture.io',
      errorAdapter: error => apiError(error, 'company lookup')
    });
    this.ipHttp = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://ip.bigpicture.io',
      errorAdapter: error => apiError(error, 'IP lookup')
    });
  }

  async findCompanyByDomain(params: {
    domain: string;
    webhookUrl?: string;
    webhookId?: string;
    stream?: boolean;
  }): Promise<{ company: Company | null; status: number; rawResponse: unknown }> {
    let domain = params.domain.trim();
    if (!domain || /[\s/:?#@]/.test(domain)) {
      throw createApiServiceError(
        'Provide a company domain such as "stripe.com", without a URL scheme or path.'
      );
    }

    if (params.webhookUrl !== undefined) {
      let parsed = URL.parse(params.webhookUrl);
      if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
        throw createApiServiceError('webhookUrl must be a complete HTTP or HTTPS URL.');
      }
    }

    let path = params.stream ? '/v1/companies/find/stream' : '/v1/companies/find';
    let response = await this.companyHttp.get<unknown>(path, {
      params: pickDefined({
        domain,
        webhookUrl: params.webhookUrl,
        webhookId: params.webhookId
      }),
      // BigPicture can hold streaming requests open for 200 seconds.
      timeout: params.stream ? 210_000 : 30_000
    });

    if (response.status === 200) {
      return {
        company: normalizeCompany(response.data),
        status: 200,
        rawResponse: response.data
      };
    }
    if (response.status === 202 || response.status === 404) {
      return { company: null, status: response.status, rawResponse: response.data };
    }

    throw apiError({ response }, 'company lookup');
  }

  async findCompanyByIp(
    ip: string
  ): Promise<{ data: IpCompanyResponse | null; rawResponse: unknown }> {
    let address = ip.trim();
    if (!isIP(address)) {
      throw createApiServiceError('Provide a valid IPv4 or IPv6 address.');
    }

    let response = await this.ipHttp.get<unknown>('/v2/companies/ip', {
      params: { ip: address }
    });

    if (response.status === 404) {
      return { data: null, rawResponse: response.data };
    }
    if (response.status !== 200) {
      throw apiError({ response }, 'IP lookup');
    }

    let data = response.data;
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('BigPicture.io returned an invalid IP lookup response.');
    }
    let result = ipCompanyResponseSchema.safeParse({
      ...data,
      ...(data.company != null ? { company: normalizeCompany(data.company) } : {})
    });
    if (!result.success) {
      throw createApiServiceError(
        'BigPicture.io returned an invalid IP lookup response, including missing or malformed profile fields.',
        { parent: result.error }
      );
    }
    return { data: result.data, rawResponse: response.data };
  }
}

let normalizeCompany = (data: unknown): Company => {
  if (!isApiErrorRecord(data)) {
    throw createApiServiceError('BigPicture.io returned an invalid company profile.');
  }
  let result = companySchema.safeParse({
    ...data,
    ...(data.id !== undefined ? { companyId: data.id } : {})
  });
  if (!result.success || !Object.keys(result.data).length) {
    throw createApiServiceError('BigPicture.io returned an invalid company profile.', {
      parent: result.success ? undefined : result.error
    });
  }
  return result.data;
};
