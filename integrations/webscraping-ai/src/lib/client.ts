import { createAxios } from 'slates';
import type {
  AccountInfo,
  AiFieldsOptions,
  AiQuestionOptions,
  HtmlPostOptions,
  ScrapingOptions,
  SelectedMultipleOptions,
  SelectedOptions,
  TextOptions
} from './types';

let apiAxios = createAxios({
  baseURL: 'https://api.webscraping.ai'
});

export class Client {
  constructor(private config: { token: string }) {}

  private buildCommonParams(
    options: ScrapingOptions
  ): Record<string, string | number | boolean | undefined> {
    return {
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
    };
  }

  private buildHeaders(options: ScrapingOptions): Record<string, string> | undefined {
    if (!options.headers || Object.keys(options.headers).length === 0) {
      return undefined;
    }
    let result: Record<string, string> = {};
    for (let [key, value] of Object.entries(options.headers)) {
      result[`headers[${key}]`] = value;
    }
    return result;
  }

  async getHtml(options: ScrapingOptions): Promise<string> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options)
    };

    let response = await apiAxios.get('/html', { params });
    return response.data as string;
  }

  async postHtml(options: HtmlPostOptions): Promise<string> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options)
    };

    let response = await apiAxios.post('/html', options.body || '', {
      params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data as string;
  }

  async getText(options: TextOptions): Promise<string> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options),
      text_format: options.textFormat,
      return_links: options.returnLinks
    };

    let response = await apiAxios.get('/text', { params });
    return response.data;
  }

  async getSelected(options: SelectedOptions): Promise<string> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options),
      selector: options.selector
    };

    let response = await apiAxios.get('/selected', { params });
    return response.data as string;
  }

  async getSelectedMultiple(options: SelectedMultipleOptions): Promise<string[]> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options)
    };

    for (let i = 0; i < options.selectors.length; i++) {
      params[`selectors[${i}]`] = options.selectors[i];
    }

    let response = await apiAxios.get('/selected-multiple', { params });
    return response.data;
  }

  async askQuestion(options: AiQuestionOptions): Promise<string> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options),
      question: options.question
    };

    let response = await apiAxios.get('/ai/question', { params });
    return response.data as string;
  }

  async extractFields(options: AiFieldsOptions): Promise<Record<string, any>> {
    let params: Record<string, any> = {
      ...this.buildCommonParams(options),
      ...this.buildHeaders(options)
    };

    for (let [key, value] of Object.entries(options.fields)) {
      params[`fields[${key}]`] = value;
    }

    let response = await apiAxios.get('/ai/fields', { params });
    return response.data;
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await apiAxios.get('/account', {
      params: { api_key: this.config.token }
    });

    let data = response.data;
    return {
      email: data.email,
      remainingApiCalls: data.remaining_api_calls,
      resetsAt: data.resets_at,
      remainingConcurrency: data.remaining_concurrency
    };
  }
}
