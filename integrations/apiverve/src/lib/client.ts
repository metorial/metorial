import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';
import {
  analyticsSchema,
  currencySchema,
  dnsSchema,
  emailSchema,
  ipSchema,
  phoneSchema,
  type qrParametersSchema,
  qrSchema,
  sentimentSchema,
  spellingSchema,
  sslSchema,
  translationSchema,
  weatherSchema
} from './schemas';

export interface ApiVerveResponse<T = unknown> {
  status: string;
  error: string | null;
  data: T;
}

let credentialKey =
  /^(?:authorization|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password)$/i;

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token.trim();
    if (!this.token) throw createApiServiceError('An APIVerve API key is required.');
    this.axios = createAxios({
      baseURL: 'https://api.apiverve.com/v1/',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        'X-API-Key': this.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // Endpoint identifiers remain on the authenticated provider origin and under /v1/.
  private resolveEndpoint(endpoint: string) {
    let path = endpoint.replace(/^\/(?!\/)/, '');
    let url: URL;
    try {
      url = new URL(path, 'https://api.apiverve.com/v1/');
    } catch {
      throw createApiServiceError(
        'Provide an APIVerve endpoint name, such as emailvalidator.'
      );
    }
    if (
      url.origin !== 'https://api.apiverve.com' ||
      !url.pathname.startsWith('/v1/') ||
      !/^\/v1\/[a-z][a-z0-9]*$/i.test(url.pathname) ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw createApiServiceError(
        'Provide an APIVerve endpoint name or /endpoint path, without another host or path traversal.'
      );
    }
    return url;
  }

  getEndpointName(endpoint: string) {
    return this.resolveEndpoint(endpoint).pathname.slice('/v1/'.length);
  }

  sanitize<T>(value: T): T {
    if (typeof value === 'string') {
      let text = this.token
        ? value
            .split(this.token)
            .join('[redacted]')
            .split(encodeURIComponent(this.token))
            .join('[redacted]')
        : value;
      return text.replace(
        /([?&](?:api[-_]?key|x[-_]?api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password)=)[^&#\s]*/gi,
        '$1[redacted]'
      ) as T;
    }
    if (Array.isArray(value)) return value.map(item => this.sanitize(item)) as T;
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          this.sanitize(key),
          credentialKey.test(key) ? '[redacted]' : this.sanitize(item)
        ])
      ) as T;
    return value;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    params: Record<string, unknown> | undefined,
    schema: z.ZodType<T>
  ): Promise<ApiVerveResponse<T>> {
    let url = this.resolveEndpoint(endpoint);
    let result: unknown;
    try {
      let response = await this.axios.request<unknown>({
        url: url.toString(),
        method,
        ...(method === 'GET' ? { params } : { data: params })
      });
      result = response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'APIVerve',
        reason: 'apiverve_request_failed',
        nestedKeys: ['error', 'errors'],
        parent: {},
        extractResponse: (input, helpers) => this.sanitize(helpers.getResponseWithBody(input)),
        formatMessage: ({ statusLabel, message }) =>
          this.sanitize(`APIVerve API request failed: ${statusLabel}${message}`)
      });
    }
    if (!isApiErrorRecord(result) || (result.status !== 'ok' && result.status !== 'error')) {
      throw createApiServiceError('APIVerve returned an invalid response envelope.');
    }
    if (result.status === 'error') {
      throw createApiServiceError(
        this.sanitize(
          typeof result.error === 'string' && result.error
            ? `APIVerve request failed: ${result.error}`
            : 'APIVerve rejected the request.'
        ),
        { reason: 'apiverve_request_failed' }
      );
    }
    if (!Object.hasOwn(result, 'data'))
      throw createApiServiceError('APIVerve returned a response without data.');
    let parsed = schema.safeParse(result.data);
    if (!parsed.success) {
      let fields = parsed.error.issues.map(issue => issue.path.join('.') || 'data').join(', ');
      throw createApiServiceError(
        `APIVerve returned invalid data for ${url.pathname.split('/').pop()}: ${fields}.`
      );
    }
    return { status: 'ok', error: null, data: parsed.data };
  }

  get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
    schema: z.ZodType<T> = z.unknown() as z.ZodType<T>
  ) {
    return this.request(endpoint, 'GET', params, schema);
  }
  post<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
    schema: z.ZodType<T> = z.unknown() as z.ZodType<T>
  ) {
    return this.request(endpoint, 'POST', data, schema);
  }
  validateEmail(email: string) {
    return this.get('emailvalidator', { email }, emailSchema);
  }
  validatePhoneNumber(number: string, country: string) {
    return this.get('phonenumbervalidator', { number, country }, phoneSchema);
  }
  getWeather(params: { city?: string; zip?: string; forecast?: boolean }) {
    return this.get('weatherforecast', params, weatherSchema);
  }
  convertCurrency(value: number, from: string, to: string) {
    return this.get('currencyconverter', { value, from, to }, currencySchema);
  }
  dnsLookup(domain: string) {
    return this.get('dnslookup', { domain }, dnsSchema);
  }
  checkSsl(domain: string) {
    return this.get('sslchecker', { domain }, sslSchema);
  }
  lookupIp(ip: string) {
    return this.get('iplookup', { ip }, ipSchema);
  }
  analyzeSentiment(text: string) {
    return this.post('sentimentanalysis', { text }, sentimentSchema);
  }
  checkSpelling(text: string) {
    return this.post('spellchecker', { text }, spellingSchema);
  }
  generateQrCode(params: z.infer<typeof qrParametersSchema>) {
    return this.post('qrcodegenerator', params, qrSchema);
  }
  translate(text: string, target: string, source?: string) {
    return this.post(
      'translator',
      { text, target, ...(source !== undefined ? { source } : {}) },
      translationSchema
    );
  }
  getUsage() {
    return this.get('analytics', undefined, analyticsSchema);
  }
  callEndpoint(endpoint: string, method: 'GET' | 'POST', params?: Record<string, unknown>) {
    return this.request(endpoint, method, params, z.unknown());
  }
}
