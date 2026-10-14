import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import type {
  CustomSearchParams,
  CustomSearchResponse,
  QueryFromUrlParams,
  QueryFromUrlResponse,
  SearchParams,
  SearchResponse,
  WebsiteMarkdownResponse,
  WebsiteScreenshotResponse,
  WebsiteTextResponse
} from './types';

let sourceSchema = z
  .object({
    title: z.string().optional(),
    url: z.string().optional(),
    snippet: z.string().optional()
  })
  .passthrough();

let imageSchema = z
  .object({
    url: z.string().optional(),
    description: z.string().optional()
  })
  .passthrough();

let responseObjectSchema = z.record(z.string(), z.unknown());

let answerSchema = z.object({
  llmResponse: z.string(),
  responseTime: z.number().optional()
});

let searchAnswerSchema = answerSchema.extend({
  sources: z.array(sourceSchema).optional(),
  images: z.array(imageSchema).optional()
});

let contentSchema = z.union([z.string(), responseObjectSchema]);

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim() || /[\r\n]/.test(config.token)) {
      throw createApiServiceError(
        'Provide a non-empty OpenPerplex API key without line breaks.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://v3.openperplexapi.com',
      authHeader: { name: 'X-API-Key', value: config.token },
      timeout: 180000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'OpenPerplex',
          reason: 'openperplex_request_failed'
        })
    });
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
    let parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw createApiServiceError(`OpenPerplex returned an invalid ${operation} response.`);
    }
    return parsed.data;
  }

  private answer(data: unknown, includeSearchResults = true): SearchResponse {
    let parsed = this.parse(responseObjectSchema, data, 'answer');
    let output = {
      llmResponse: parsed.llm_response ?? parsed.response,
      responseTime: parsed.response_time
    };
    return includeSearchResults
      ? this.parse(
          searchAnswerSchema,
          { ...output, sources: parsed.sources, images: parsed.images },
          'search answer'
        )
      : this.parse(answerSchema, output, 'URL query answer');
  }

  private requireUrl(value: string, label: string) {
    let parsed = z.url().safeParse(value);
    if (!parsed.success || !/^https?:\/\//i.test(value)) {
      throw createApiServiceError(`Provide a valid HTTP or HTTPS ${label}.`);
    }
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    let response = await this.axios.get('/search', {
      params: pickDefined({
        query: params.query,
        date_context: params.dateContext,
        location: params.location ?? 'us',
        model: params.model ?? 'gpt-4o-mini',
        response_language: params.responseLanguage ?? 'auto',
        answer_type: params.answerType ?? 'text',
        search_type: params.searchType ?? 'general',
        return_citations: params.returnCitations ?? false,
        return_sources: params.returnSources ?? false,
        return_images: params.returnImages ?? false,
        recency_filter: params.recencyFilter ?? 'anytime'
      })
    });

    return this.answer(response.data);
  }

  async customSearch(params: CustomSearchParams): Promise<CustomSearchResponse> {
    let response = await this.axios.post('/custom_search', {
      system_prompt: params.systemPrompt,
      user_prompt: params.userPrompt,
      location: params.location ?? 'us',
      model: params.model ?? 'gpt-4o-mini',
      response_language: params.responseLanguage ?? 'auto',
      search_type: params.searchType ?? 'general',
      temperature: params.temperature ?? 0.2,
      top_p: params.topP ?? 0.9,
      return_sources: params.returnSources ?? false,
      return_images: params.returnImages ?? false,
      recency_filter: params.recencyFilter ?? 'anytime'
    });

    return this.answer(response.data);
  }

  async queryFromUrl(params: QueryFromUrlParams): Promise<QueryFromUrlResponse> {
    this.requireUrl(params.url, 'web page URL');
    let response = await this.axios.get('/query_from_url', {
      params: {
        url: params.url,
        query: params.query,
        model: params.model ?? 'gpt-4o-mini',
        response_language: params.responseLanguage ?? 'auto',
        answer_type: params.answerType ?? 'text'
      }
    });

    let data = this.answer(response.data, false);
    return {
      llmResponse: data.llmResponse,
      responseTime: data.responseTime
    };
  }

  async getWebsiteText(url: string): Promise<WebsiteTextResponse> {
    this.requireUrl(url, 'web page URL');
    let response = await this.axios.get('/get_website_text', {
      params: { url }
    });

    let data = this.parse(contentSchema, response.data, 'website text');
    let text = this.parse(
      z.string(),
      typeof data === 'string' ? data : (data.text ?? data.content),
      'website text'
    );
    return {
      websiteUrl: url,
      text
    };
  }

  async getWebsiteMarkdown(url: string): Promise<WebsiteMarkdownResponse> {
    this.requireUrl(url, 'web page URL');
    let response = await this.axios.get('/get_website_markdown', {
      params: { url }
    });

    let data = this.parse(contentSchema, response.data, 'website Markdown');
    let markdown = this.parse(
      z.string(),
      typeof data === 'string' ? data : (data.markdown ?? data.content),
      'website Markdown'
    );
    return {
      websiteUrl: url,
      markdown
    };
  }

  async getWebsiteScreenshot(url: string): Promise<WebsiteScreenshotResponse> {
    this.requireUrl(url, 'web page URL');
    let response = await this.axios.get('/get_website_screenshot', {
      params: { url }
    });

    let data = this.parse(contentSchema, response.data, 'screenshot');
    let screenshotUrl = this.parse(
      z.string(),
      typeof data === 'string' ? data : (data.screenshot_url ?? data.url),
      'screenshot'
    );
    this.requireUrl(screenshotUrl, 'screenshot URL');
    return {
      websiteUrl: url,
      screenshotUrl
    };
  }
}
