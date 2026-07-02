import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.tavily.com'
});

export interface SearchParams {
  query: string;
  searchDepth?: 'ultra-fast' | 'fast' | 'basic' | 'advanced';
  topic?: 'general' | 'news' | 'finance';
  maxResults?: number;
  chunksPerSource?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  includeAnswer?: boolean | 'basic' | 'advanced';
  includeRawContent?: boolean | 'markdown' | 'text';
  includeImages?: boolean;
  includeImageDescriptions?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  country?: string;
  autoParameters?: boolean;
  exactMatch?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  rawContent?: string;
  favicon?: string;
}

export interface SearchResponse {
  query: string;
  answer?: string;
  images?: Array<{ url: string; description?: string }>;
  results: SearchResult[];
  autoParameters?: Record<string, unknown>;
  responseTime: number;
  requestId: string;
}

export interface ExtractParams {
  urls: string[];
  query?: string;
  chunksPerSource?: number;
  extractDepth?: 'basic' | 'advanced';
  includeImages?: boolean;
  format?: 'markdown' | 'text';
  timeout?: number;
}

export interface ExtractResult {
  url: string;
  rawContent: string;
  images?: string[];
  favicon?: string;
}

export interface ExtractFailedResult {
  url: string;
  error: string;
}

export interface ExtractResponse {
  results: ExtractResult[];
  failedResults: ExtractFailedResult[];
  responseTime: number;
  requestId: string;
}

export interface CrawlParams {
  url: string;
  instructions?: string;
  chunksPerSource?: number;
  maxDepth?: number;
  maxBreadth?: number;
  limit?: number;
  selectPaths?: string[];
  selectDomains?: string[];
  excludePaths?: string[];
  excludeDomains?: string[];
  allowExternal?: boolean;
  includeImages?: boolean;
  extractDepth?: 'basic' | 'advanced';
  format?: 'markdown' | 'text';
  timeout?: number;
}

export interface CrawlResult {
  url: string;
  rawContent: string;
  favicon?: string;
}

export interface CrawlResponse {
  baseUrl: string;
  results: CrawlResult[];
  responseTime: number;
  requestId: string;
}

export interface MapParams {
  url: string;
  instructions?: string;
  maxDepth?: number;
  maxBreadth?: number;
  limit?: number;
  selectPaths?: string[];
  selectDomains?: string[];
  excludePaths?: string[];
  excludeDomains?: string[];
  allowExternal?: boolean;
  timeout?: number;
}

export interface MapResponse {
  baseUrl: string;
  results: string[];
  responseTime: number;
  requestId: string;
}

export interface ResearchParams {
  input: string;
  model?: 'mini' | 'pro' | 'auto';
  outputSchema?: Record<string, unknown>;
  citationFormat?: 'numbered' | 'mla' | 'apa' | 'chicago';
}

export interface ResearchCreateResponse {
  requestId: string;
  createdAt: string;
  status: string;
  input: string;
  model: string;
  responseTime: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  favicon?: string;
}

export interface ResearchGetResponse {
  requestId: string;
  createdAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  content?: string | Record<string, unknown>;
  sources?: ResearchSource[];
  responseTime: number;
}

export interface UsageResponse {
  usage: number;
  limit: number | null;
  searchUsage: number;
  extractUsage: number;
  crawlUsage: number;
  mapUsage: number;
  researchUsage: number;
  currentPlan: string;
  planUsage: number;
  planLimit: number;
  paygoUsage: number;
  paygoLimit: number;
}

export class Client {
  private token: string;
  private projectId?: string;

  constructor(config: { token: string; projectId?: string }) {
    this.token = config.token;
    this.projectId = config.projectId;
  }

  private getHeaders(): Record<string, string> {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
    if (this.projectId) {
      headers['X-Project-ID'] = this.projectId;
    }
    return headers;
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    let body: Record<string, unknown> = {
      query: params.query,
      include_usage: true
    };

    if (params.searchDepth) body.search_depth = params.searchDepth;
    if (params.topic) body.topic = params.topic;
    if (params.maxResults !== undefined) body.max_results = params.maxResults;
    if (params.chunksPerSource !== undefined) body.chunks_per_source = params.chunksPerSource;
    if (params.timeRange) body.time_range = params.timeRange;
    if (params.startDate) body.start_date = params.startDate;
    if (params.endDate) body.end_date = params.endDate;
    if (params.includeAnswer !== undefined) body.include_answer = params.includeAnswer;
    if (params.includeRawContent !== undefined)
      body.include_raw_content = params.includeRawContent;
    if (params.includeImages !== undefined) body.include_images = params.includeImages;
    if (params.includeImageDescriptions !== undefined)
      body.include_image_descriptions = params.includeImageDescriptions;
    if (params.includeDomains && params.includeDomains.length > 0)
      body.include_domains = params.includeDomains;
    if (params.excludeDomains && params.excludeDomains.length > 0)
      body.exclude_domains = params.excludeDomains;
    if (params.country) body.country = params.country;
    if (params.autoParameters !== undefined) body.auto_parameters = params.autoParameters;
    if (params.exactMatch !== undefined) body.exact_match = params.exactMatch;

    let response = await http.post('/search', body, {
      headers: this.getHeaders()
    });

    let data = response.data;

    return {
      query: data.query,
      answer: data.answer,
      images: data.images,
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        rawContent: r.raw_content,
        favicon: r.favicon
      })),
      autoParameters: data.auto_parameters,
      responseTime: data.response_time,
      requestId: data.request_id
    };
  }

  async extract(params: ExtractParams): Promise<ExtractResponse> {
    let body: Record<string, unknown> = {
      urls: params.urls,
      include_usage: true
    };

    if (params.query) body.query = params.query;
    if (params.chunksPerSource !== undefined) body.chunks_per_source = params.chunksPerSource;
    if (params.extractDepth) body.extract_depth = params.extractDepth;
    if (params.includeImages !== undefined) body.include_images = params.includeImages;
    if (params.format) body.format = params.format;
    if (params.timeout !== undefined) body.timeout = params.timeout;

    let response = await http.post('/extract', body, {
      headers: this.getHeaders()
    });

    let data = response.data;

    return {
      results: (data.results || []).map((r: any) => ({
        url: r.url,
        rawContent: r.raw_content,
        images: r.images,
        favicon: r.favicon
      })),
      failedResults: (data.failed_results || []).map((r: any) => ({
        url: r.url,
        error: r.error
      })),
      responseTime: data.response_time,
      requestId: data.request_id
    };
  }

  async crawl(params: CrawlParams): Promise<CrawlResponse> {
    let body: Record<string, unknown> = {
      url: params.url,
      include_usage: true
    };

    if (params.instructions) body.instructions = params.instructions;
    if (params.chunksPerSource !== undefined) body.chunks_per_source = params.chunksPerSource;
    if (params.maxDepth !== undefined) body.max_depth = params.maxDepth;
    if (params.maxBreadth !== undefined) body.max_breadth = params.maxBreadth;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.selectPaths && params.selectPaths.length > 0)
      body.select_paths = params.selectPaths;
    if (params.selectDomains && params.selectDomains.length > 0)
      body.select_domains = params.selectDomains;
    if (params.excludePaths && params.excludePaths.length > 0)
      body.exclude_paths = params.excludePaths;
    if (params.excludeDomains && params.excludeDomains.length > 0)
      body.exclude_domains = params.excludeDomains;
    if (params.allowExternal !== undefined) body.allow_external = params.allowExternal;
    if (params.includeImages !== undefined) body.include_images = params.includeImages;
    if (params.extractDepth) body.extract_depth = params.extractDepth;
    if (params.format) body.format = params.format;
    if (params.timeout !== undefined) body.timeout = params.timeout;

    let response = await http.post('/crawl', body, {
      headers: this.getHeaders()
    });

    let data = response.data;

    return {
      baseUrl: data.base_url,
      results: (data.results || []).map((r: any) => ({
        url: r.url,
        rawContent: r.raw_content,
        favicon: r.favicon
      })),
      responseTime: data.response_time,
      requestId: data.request_id
    };
  }

  async map(params: MapParams): Promise<MapResponse> {
    let body: Record<string, unknown> = {
      url: params.url,
      include_usage: true
    };

    if (params.instructions) body.instructions = params.instructions;
    if (params.maxDepth !== undefined) body.max_depth = params.maxDepth;
    if (params.maxBreadth !== undefined) body.max_breadth = params.maxBreadth;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.selectPaths && params.selectPaths.length > 0)
      body.select_paths = params.selectPaths;
    if (params.selectDomains && params.selectDomains.length > 0)
      body.select_domains = params.selectDomains;
    if (params.excludePaths && params.excludePaths.length > 0)
      body.exclude_paths = params.excludePaths;
    if (params.excludeDomains && params.excludeDomains.length > 0)
      body.exclude_domains = params.excludeDomains;
    if (params.allowExternal !== undefined) body.allow_external = params.allowExternal;
    if (params.timeout !== undefined) body.timeout = params.timeout;

    let response = await http.post('/map', body, {
      headers: this.getHeaders()
    });

    let data = response.data;

    return {
      baseUrl: data.base_url,
      results: data.results || [],
      responseTime: data.response_time,
      requestId: data.request_id
    };
  }

  async createResearch(params: ResearchParams): Promise<ResearchCreateResponse> {
    let body: Record<string, unknown> = {
      input: params.input
    };

    if (params.model) body.model = params.model;
    if (params.outputSchema) body.output_schema = params.outputSchema;
    if (params.citationFormat) body.citation_format = params.citationFormat;

    let response = await http.post('/research', body, {
      headers: this.getHeaders()
    });

    let data = response.data;

    return {
      requestId: data.request_id,
      createdAt: data.created_at,
      status: data.status,
      input: data.input,
      model: data.model,
      responseTime: data.response_time
    };
  }

  async getResearch(requestId: string): Promise<ResearchGetResponse> {
    let response = await http.get(`/research/${requestId}`, {
      headers: this.getHeaders()
    });

    let data = response.data;

    return {
      requestId: data.request_id,
      createdAt: data.created_at,
      status: data.status,
      content: data.content,
      sources: data.sources?.map((s: any) => ({
        title: s.title,
        url: s.url,
        favicon: s.favicon
      })),
      responseTime: data.response_time
    };
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await http.get('/usage', {
      headers: this.getHeaders()
    });

    let data = response.data;
    let key = data.key || {};
    let account = data.account || {};

    return {
      usage: key.usage ?? 0,
      limit: key.limit ?? null,
      searchUsage: key.search_usage ?? account.search_usage ?? 0,
      extractUsage: key.extract_usage ?? account.extract_usage ?? 0,
      crawlUsage: key.crawl_usage ?? account.crawl_usage ?? 0,
      mapUsage: key.map_usage ?? account.map_usage ?? 0,
      researchUsage: key.research_usage ?? account.research_usage ?? 0,
      currentPlan: account.current_plan ?? 'unknown',
      planUsage: account.plan_usage ?? 0,
      planLimit: account.plan_limit ?? 0,
      paygoUsage: account.paygo_usage ?? 0,
      paygoLimit: account.paygo_limit ?? 0
    };
  }
}
