import { createAxios } from 'slates';

export interface SearchParams {
  query: string;
  depth: 'standard' | 'deep';
  outputType: 'sourcedAnswer' | 'searchResults' | 'structured';
  structuredOutputSchema?: string;
  fromDate?: string;
  toDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
  includeImages?: boolean;
  includeInlineCitations?: boolean;
  includeSources?: boolean;
}

export interface SearchSource {
  name: string;
  url: string;
  snippet: string;
}

export interface SearchImage {
  url: string;
  description?: string;
}

export interface SearchResult {
  answer?: string;
  results?: SearchResultItem[];
  images?: SearchImage[];
  sources?: SearchSource[];
}

export interface SearchResultItem {
  name: string;
  url: string;
  content: string;
}

export interface FetchParams {
  url: string;
  includeRawHtml?: boolean;
  renderJs?: boolean;
  extractImages?: boolean;
}

export interface FetchResult {
  url: string;
  content: string;
  rawHtml?: string;
  images?: SearchImage[];
}

export interface CreditBalance {
  remainingCredits: number;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.linkup.so/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async search(params: SearchParams): Promise<SearchResult> {
    let body: Record<string, unknown> = {
      q: params.query,
      depth: params.depth,
      outputType: params.outputType
    };

    if (params.structuredOutputSchema) {
      body.structuredOutputSchema = params.structuredOutputSchema;
    }
    if (params.fromDate) {
      body.fromDate = params.fromDate;
    }
    if (params.toDate) {
      body.toDate = params.toDate;
    }
    if (params.includeDomains && params.includeDomains.length > 0) {
      body.includeDomains = params.includeDomains;
    }
    if (params.excludeDomains && params.excludeDomains.length > 0) {
      body.excludeDomains = params.excludeDomains;
    }
    if (params.maxResults !== undefined) {
      body.maxResults = params.maxResults;
    }
    if (params.includeImages !== undefined) {
      body.includeImages = params.includeImages;
    }
    if (params.includeInlineCitations !== undefined) {
      body.includeInlineCitations = params.includeInlineCitations;
    }
    if (params.includeSources !== undefined) {
      body.includeSources = params.includeSources;
    }

    let response = await this.axios.post('/search', body);
    return response.data;
  }

  async fetchWebpage(params: FetchParams): Promise<FetchResult> {
    let queryParams: Record<string, string> = {
      url: params.url
    };

    if (params.includeRawHtml !== undefined) {
      queryParams.includeRawHtml = String(params.includeRawHtml);
    }
    if (params.renderJs !== undefined) {
      queryParams.renderJs = String(params.renderJs);
    }
    if (params.extractImages !== undefined) {
      queryParams.extractImages = String(params.extractImages);
    }

    let response = await this.axios.get('/fetch', { params: queryParams });
    return response.data;
  }

  async getCreditBalance(): Promise<CreditBalance> {
    let response = await this.axios.get('/credits/balance');
    return response.data;
  }
}
