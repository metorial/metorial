import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorResponse,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface CreateLeadParams {
  customerId?: string;
  name: string;
  email: string;
  phone?: string;
  platform?: string;
  country?: string;
  more?: Record<string, unknown>;
}

export type CreateLeadResponse = Record<string, unknown>;

let leadResponse = z
  .object({ status: z.literal('success'), message: z.string() })
  .passthrough();

export class Client {
  private readonly axios: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;

  constructor(private readonly config: { token: string; rapidApiToken: string }) {
    for (let key of [config.token, config.rapidApiToken]) {
      if (typeof key !== 'string' || !key.trim() || /[\r\n]/.test(key)) {
        throw createApiServiceError(
          'Provide both API keys without blank values or line breaks.'
        );
      }
    }
    this.redactor = new AuthConfigSecretRedactor({
      values: [config.token, config.rapidApiToken].flatMap(key => [
        key,
        encodeURIComponent(key),
        new URLSearchParams({ value: key }).toString().slice(6)
      ])
    });
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://pagexcrm.p.rapidapi.com',
      authHeader: { name: 'x-rapidapi-key', value: config.rapidApiToken },
      headers: { 'x-rapidapi-host': 'pagexcrm.p.rapidapi.com' },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error => this.apiError(error)
    });
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.redactor
        .redactEmbedded(value)
        .replace(/\$\$MT\$secret\$authConfig\$values\.\d+(?:\$\$)?/g, '[redacted]');
    }
    if (Array.isArray(value)) return value.map(entry => this.sanitize(entry));
    if (isApiErrorRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          String(this.sanitize(key)),
          typeof entry === 'string' &&
          /^(?:api[-_]?key|x[-_]?rapidapi[-_]?key|rapidapi[-_]?(?:key|token))$/i.test(key)
            ? '[redacted]'
            : this.sanitize(entry)
        ])
      );
    }
    return value;
  }

  private apiError(error: unknown) {
    let response = getApiErrorResponse(error);
    let baggage =
      isApiErrorRecord(error) &&
      error.name === 'SlateError' &&
      isApiErrorRecord(error.data) &&
      isApiErrorRecord(error.data.baggage)
        ? error.data.baggage
        : undefined;
    let body: unknown = response?.data ?? baggage?.response;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Non-JSON gateway responses use the safe fallback below.
      }
    }
    body = this.sanitize(body);
    let message = isApiErrorRecord(body) ? body.message : undefined;
    let detail =
      typeof message === 'string' &&
      message.trim() &&
      !/^\s*</.test(message) &&
      !/^\[(?:truncated|redacted|unserializable)\]$/i.test(message.trim())
        ? message.trim().slice(0, 1000)
        : 'Completion is unconfirmed. Check the API keys, subscription and lead details before retrying.';
    return buildApiServiceError(
      { response: { status: response?.status, data: { message: detail } } },
      { providerLabel: 'PageXCRM', reason: 'pagexcrm_api_error', operation: 'create lead' }
    );
  }

  async createLead(params: CreateLeadParams): Promise<CreateLeadResponse> {
    let hasLeadValue = [
      params.name,
      params.email,
      params.phone,
      params.customerId,
      params.platform,
      params.country
    ].some(value => value?.trim());
    if (!hasLeadValue && Object.keys(params.more ?? {}).length === 0) {
      throw createApiServiceError(
        'Provide at least one nonblank lead field or a nonempty custom details object.'
      );
    }
    if (
      params.country !== undefined &&
      params.more?.country !== undefined &&
      params.more.country !== params.country
    ) {
      throw createApiServiceError(
        'Use the same country value in country and more.country, or provide only one.'
      );
    }
    let more =
      params.country === undefined ? params.more : { ...params.more, country: params.country };
    let response = await this.axios.post(
      '/api/lead',
      pickDefined({
        api_key: this.config.token,
        customer_id: params.customerId,
        name: params.name,
        email: params.email,
        phone: params.phone,
        plat: params.platform,
        more
      })
    );
    let data = this.sanitize(response.data);
    if (isApiErrorRecord(data) && data.status === 'error') {
      throw this.apiError({ response: { status: response.status, data } });
    }
    let parsed = leadResponse.safeParse(data);
    if (!parsed.success) {
      throw createApiServiceError(
        'PageXCRM returned an invalid lead response. Completion is unconfirmed; check the CRM before retrying.'
      );
    }
    return parsed.data;
  }
}
