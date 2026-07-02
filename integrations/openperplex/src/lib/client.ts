import { createAxios } from 'slates';
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

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.openperplex.com',
      headers: {
        'X-API-Key': config.token
      }
    });
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    let response = await this.axios.get('/search', {
      params: {
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
      }
    });

    let data = response.data;
    return {
      llmResponse: data.llm_response ?? data.response ?? '',
      sources: data.sources,
      images: data.images,
      responseTime: data.response_time
    };
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

    let data = response.data;
    return {
      llmResponse: data.llm_response ?? data.response ?? '',
      sources: data.sources,
      images: data.images,
      responseTime: data.response_time
    };
  }

  async queryFromUrl(params: QueryFromUrlParams): Promise<QueryFromUrlResponse> {
    let response = await this.axios.get('/query_from_url', {
      params: {
        url: params.url,
        query: params.query,
        model: params.model ?? 'gpt-4o-mini',
        response_language: params.responseLanguage ?? 'auto',
        answer_type: params.answerType ?? 'text'
      }
    });

    let data = response.data;
    return {
      llmResponse: data.llm_response ?? data.response ?? '',
      responseTime: data.response_time
    };
  }

  async getWebsiteText(url: string): Promise<WebsiteTextResponse> {
    let response = await this.axios.get('/get_website_text', {
      params: { url }
    });

    let data = response.data;
    return {
      websiteUrl: url,
      text: typeof data === 'string' ? data : (data.text ?? data.content ?? '')
    };
  }

  async getWebsiteMarkdown(url: string): Promise<WebsiteMarkdownResponse> {
    let response = await this.axios.get('/get_website_markdown', {
      params: { url }
    });

    let data = response.data;
    return {
      websiteUrl: url,
      markdown: typeof data === 'string' ? data : (data.markdown ?? data.content ?? '')
    };
  }

  async getWebsiteScreenshot(url: string): Promise<WebsiteScreenshotResponse> {
    let response = await this.axios.get('/get_website_screenshot', {
      params: { url }
    });

    let data = response.data;
    return {
      websiteUrl: url,
      screenshotUrl: typeof data === 'string' ? data : (data.screenshot_url ?? data.url ?? '')
    };
  }
}
