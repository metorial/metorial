import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import type {
  AccountInfo,
  AiFieldsOptions,
  AiQuestionOptions,
  HtmlPostOptions,
  ScrapingOptions,
  SearchOptions,
  SelectedMultipleOptions,
  SelectedOptions,
  StructuredDataOptions,
  TextOptions
} from './types';

let apiAxios = createAxios({
  baseURL: 'https://api.webscraping.ai',
  timeout: 60000
});

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'WebScraping.AI',
    reason: 'webscraping_ai_request_failed',
    operation,
    extractStatus: (value, response) => {
      if (response?.status !== undefined) return response.status;
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return undefined;
      let upstream = isApiErrorRecord(value.data.upstream) ? value.data.upstream : undefined;
      let status = upstream?.status ?? value.data.upstreamStatus ?? value.data.status;
      return typeof status === 'number' || typeof status === 'string' ? status : undefined;
    },
    extractUpstreamCode: (value, response) => {
      if (isApiErrorRecord(response?.data) && typeof response.data.error_code === 'string') {
        return response.data.error_code;
      }
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return undefined;
      let upstream = isApiErrorRecord(value.data.upstream) ? value.data.upstream : undefined;
      return typeof upstream?.code === 'string' ? upstream.code : undefined;
    }
  });

let requireObject = (value: unknown, operation: string): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`WebScraping.AI returned an invalid ${operation} response.`);
  }
  return value;
};

let validateUrl = (url: string) => {
  try {
    let parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return;
  } catch {}
  throw createApiServiceError('Provide a valid HTTP or HTTPS webpage URL.');
};

export class Client {
  constructor(private config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A WebScraping.AI API key is required. Reconnect with a valid key.'
      );
    }
  }

  private buildCommonParams(options: ScrapingOptions): URLSearchParams {
    validateUrl(options.url);
    if (options.proxy === 'auto' && options.customProxy !== undefined) {
      throw createApiServiceError(
        'proxy=auto cannot be combined with customProxy. Remove customProxy or choose an explicit proxy tier.'
      );
    }
    for (let [name, value, maximum] of [
      ['jsTimeout', options.jsTimeout, 20000],
      ['timeout', options.timeout, undefined]
    ] as const) {
      if (
        value !== undefined &&
        (!Number.isInteger(value) || value < 1 || (maximum !== undefined && value > maximum))
      ) {
        throw createApiServiceError(
          `${name} must be a positive whole number${maximum ? ` no greater than ${maximum}` : ''}.`
        );
      }
    }
    let values = pickDefined({
      api_key: this.config.token,
      url: options.url,
      js: options.js,
      js_timeout: options.jsTimeout,
      timeout: options.timeout,
      wait_for: options.waitFor,
      proxy: options.proxy,
      country: options.country,
      device: options.device,
      js_script: options.jsScript,
      custom_proxy: options.customProxy,
      error_on_404: options.errorOn404,
      error_on_redirect: options.errorOnRedirect
    });
    let params = new URLSearchParams();
    for (let [key, value] of Object.entries(values)) params.set(key, String(value));
    for (let [key, value] of Object.entries(options.headers ?? {})) {
      params.set(`headers[${key}]`, value);
    }
    return params;
  }

  async getHtml(options: ScrapingOptions): Promise<string> {
    let params = this.buildCommonParams(options);
    params.set('format', 'text');
    return requestAxiosData<string>(
      'get HTML',
      () => apiAxios.get('/html', { params, responseType: 'text' }),
      apiError
    );
  }

  async postHtml(options: HtmlPostOptions): Promise<string> {
    let headerType = Object.entries(options.headers ?? {}).find(
      ([key]) => key.toLowerCase() === 'content-type'
    )?.[1];
    let contentType = options.contentType ?? headerType ?? 'application/x-www-form-urlencoded';
    let headers = Object.fromEntries(
      Object.entries(options.headers ?? {}).filter(
        ([key]) => key.toLowerCase() !== 'content-type'
      )
    );
    headers['Content-Type'] = contentType;
    let params = this.buildCommonParams({ ...options, headers });
    params.set('format', 'text');
    // The API parses form-encoded request bodies; send them as raw text instead.
    let apiContentType =
      contentType.split(';')[0]?.trim().toLowerCase() === 'application/x-www-form-urlencoded'
        ? 'text/plain'
        : contentType;
    return requestAxiosData<string>(
      'post HTML',
      () =>
        apiAxios.post('/html', options.body ?? '', {
          params,
          responseType: 'text',
          transformRequest: [body => body],
          headers: { 'Content-Type': apiContentType }
        }),
      apiError
    );
  }

  async getText(options: TextOptions): Promise<string> {
    if (options.returnLinks && options.textFormat !== 'json') {
      throw createApiServiceError('Set textFormat to json when returnLinks is enabled.');
    }
    let params = this.buildCommonParams(options);
    if (options.textFormat !== undefined) params.set('text_format', options.textFormat);
    if (options.returnLinks !== undefined)
      params.set('return_links', String(options.returnLinks));
    return requestAxiosData<string>(
      'extract text',
      () => apiAxios.get('/text', { params, responseType: 'text' }),
      apiError
    );
  }

  async getSelected(options: SelectedOptions): Promise<string> {
    if (!options.selector.trim())
      throw createApiServiceError('Provide a non-empty CSS selector.');
    let params = this.buildCommonParams(options);
    params.set('selector', options.selector);
    params.set('format', 'text');
    return requestAxiosData<string>(
      'select HTML',
      () => apiAxios.get('/selected', { params, responseType: 'text' }),
      apiError
    );
  }

  async getSelectedMultiple(options: SelectedMultipleOptions): Promise<string[]> {
    if (options.selectors.length === 0 || options.selectors.some(value => !value.trim())) {
      throw createApiServiceError('Provide at least one non-empty CSS selector.');
    }
    let params = this.buildCommonParams(options);
    for (let selector of options.selectors) params.append('selectors', selector);
    let data = await requestAxiosData<unknown>(
      'select multiple HTML areas',
      () => apiAxios.get('/selected-multiple', { params }),
      apiError
    );
    if (!Array.isArray(data) || data.length !== options.selectors.length) {
      throw createApiServiceError(
        'WebScraping.AI returned an invalid multiple-selector response.'
      );
    }
    return data.map(matches => {
      if (typeof matches === 'string') return matches;
      if (Array.isArray(matches) && matches.every(value => typeof value === 'string')) {
        return matches.join('\n');
      }
      throw createApiServiceError('WebScraping.AI returned invalid HTML for a selector.');
    });
  }

  async askQuestion(options: AiQuestionOptions): Promise<string> {
    if (!options.question.trim()) throw createApiServiceError('Provide a non-empty question.');
    let params = this.buildCommonParams(options);
    params.set('question', options.question);
    params.set('format', 'text');
    return requestAxiosData<string>(
      'ask a question',
      () => apiAxios.get('/ai/question', { params, responseType: 'text' }),
      apiError
    );
  }

  async extractFields(options: AiFieldsOptions): Promise<Record<string, unknown>> {
    let fields = Object.entries(options.fields);
    if (fields.length === 0 || fields.some(([key, value]) => !key.trim() || !value.trim())) {
      throw createApiServiceError(
        'Provide at least one field with a non-empty name and description.'
      );
    }
    let params = this.buildCommonParams(options);
    for (let [key, value] of fields) params.set(`fields[${key}]`, value);
    let data = requireObject(
      await requestAxiosData<unknown>(
        'extract fields',
        () => apiAxios.get('/ai/fields', { params }),
        apiError
      ),
      'field extraction'
    );
    return data;
  }

  async getAccount(): Promise<AccountInfo> {
    let data = requireObject(
      await requestAxiosData<unknown>(
        'get account information',
        () => apiAxios.get('/account', { params: { api_key: this.config.token } }),
        apiError
      ),
      'account'
    );
    let reset =
      typeof data.resets_at === 'number' ? new Date(data.resets_at * 1000) : undefined;
    let resetsAt =
      reset && Number.isFinite(reset.getTime()) ? reset.toISOString() : data.resets_at;
    if (
      typeof data.email !== 'string' ||
      typeof data.remaining_api_calls !== 'number' ||
      typeof resetsAt !== 'string' ||
      typeof data.remaining_concurrency !== 'number'
    ) {
      throw createApiServiceError('WebScraping.AI returned invalid account information.');
    }
    return {
      email: data.email,
      remainingApiCalls: data.remaining_api_calls,
      resetsAt,
      remainingConcurrency: data.remaining_concurrency,
      remainingMonthlyCredits:
        typeof data.remaining_monthly_credits === 'number'
          ? data.remaining_monthly_credits
          : undefined,
      remainingPaygCredits:
        typeof data.remaining_payg_credits === 'number'
          ? data.remaining_payg_credits
          : undefined,
      remainingTotalCredits:
        typeof data.remaining_total_credits === 'number'
          ? data.remaining_total_credits
          : undefined
    };
  }

  async search(options: SearchOptions): Promise<Record<string, unknown>> {
    if (!options.query.trim())
      throw createApiServiceError('Provide a non-empty search query.');
    if (
      options.page !== undefined &&
      (!Number.isInteger(options.page) || options.page < 1 || options.page > 100)
    ) {
      throw createApiServiceError('page must be a whole number from 1 to 100.');
    }
    return requireObject(
      await requestAxiosData<unknown>(
        'search Google',
        () =>
          apiAxios.get('/serp', {
            params: pickDefined({
              api_key: this.config.token,
              q: options.query,
              engine: 'google',
              gl: options.country,
              hl: options.language,
              page: options.page
            })
          }),
        apiError
      ),
      'search'
    );
  }

  async getStructuredData(options: StructuredDataOptions): Promise<Record<string, unknown>> {
    validateUrl(options.url);
    if (options.transcriptLanguage && !options.transcript) {
      throw createApiServiceError('Enable transcript when providing transcriptLanguage.');
    }
    return requireObject(
      await requestAxiosData<unknown>(
        'get structured data',
        () =>
          apiAxios.get('/data', {
            params: pickDefined({
              api_key: this.config.token,
              url: options.url,
              country: options.country,
              transcript: options.transcript,
              transcript_language: options.transcriptLanguage
            })
          }),
        apiError
      ),
      'structured data'
    );
  }
}
