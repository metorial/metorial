import { createAuthenticatedAxios, pickDefined } from 'slates';
import {
  credential,
  requestId,
  requireValue,
  safeJson,
  upstream,
  validateInput
} from './contracts';
import {
  crawlResponse,
  extractResponse,
  mapResponse,
  parse,
  researchCreateResponse,
  researchResponse,
  searchResponse,
  usageResponse
} from './models';
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
  requestId?: string;
  usageCredits?: number;
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
  requestId?: string;
  usageCredits?: number;
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
  requestId?: string;
  usageCredits?: number;
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
  requestId?: string;
  usageCredits?: number;
}

export interface ResearchParams {
  input: string;
  model?: 'mini' | 'pro' | 'auto';
  outputSchema?: Record<string, unknown>;
  citationFormat?: 'numbered' | 'mla' | 'apa' | 'chicago';
}

export interface ResearchCreateResponse {
  requestId: string;
  usageCredits?: number;
  createdAt: string;
  status: 'pending' | 'in_progress';
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
  usageCredits?: number;
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
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly token: string;
  private readonly projectId?: string;
  constructor(config: { token: string; projectId?: string }) {
    credential(config.token);
    if (config.projectId !== undefined) credential(config.projectId);
    this.token = config.token;
    this.projectId = config.projectId;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.tavily.com',
      authHeader: { value: `Bearer ${this.token}` },
      timeout: 180000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      errorMapping: {
        mapAxiosError: () => ({
          message: 'Tavily request failed. Check API key, parameters and available credits.'
        })
      },
      errorAdapter: upstream
    });
  }
  private async request(path: string, body?: Record<string, unknown>, timeout?: number) {
    try {
      if (body !== undefined) safeJson(body, [this.token]);
      const response = await this.http.request({
        method: body === undefined ? 'GET' : 'POST',
        url: path,
        timeout: timeout ?? (path.startsWith('/research/') ? 30000 : 180000),
        data: body === undefined ? undefined : pickDefined(body),
        headers:
          path === '/usage' && this.projectId !== undefined
            ? { 'X-Project-ID': this.projectId }
            : undefined,
        params: path.startsWith('/research/') ? { include_usage: true } : undefined
      });
      safeJson(
        {
          data: response.data,
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        },
        [this.token]
      );
      const statuses =
        path === '/research' ? [201] : path.startsWith('/research/') ? [200, 202] : [200];
      requireValue(
        statuses.includes(response.status),
        'Tavily did not return the documented native response status. Reconcile any accepted request before retrying.'
      );
      return response;
    } catch (error) {
      throw upstream(error);
    }
  }
  async search(params: SearchParams): Promise<SearchResponse> {
    validateInput('web_search', params as unknown as Record<string, unknown>, this.token);
    const d = parse(
      searchResponse,
      (
        await this.request('/search', {
          query: params.query,
          include_usage: true,
          search_depth: params.searchDepth,
          topic: params.topic,
          max_results: params.maxResults,
          chunks_per_source: params.chunksPerSource,
          time_range: params.timeRange,
          start_date: params.startDate,
          end_date: params.endDate,
          include_answer: params.includeAnswer,
          include_raw_content: params.includeRawContent,
          include_images: params.includeImages,
          include_image_descriptions: params.includeImageDescriptions,
          include_domains: params.includeDomains,
          exclude_domains: params.excludeDomains,
          country: params.country,
          auto_parameters: params.autoParameters,
          exact_match: params.exactMatch
        })
      ).data
    );
    requireValue(
      params.maxResults === undefined || d.results.length <= params.maxResults,
      'Tavily returned more search results than requested. Credits may already have been consumed; reconcile before retrying.'
    );
    return {
      query: d.query,
      answer: d.answer,
      images: d.images,
      results: d.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        rawContent: r.raw_content,
        favicon: r.favicon
      })),
      autoParameters: d.auto_parameters,
      responseTime: d.response_time,
      requestId: d.request_id,
      usageCredits: d.usage?.credits
    };
  }
  async extract(params: ExtractParams): Promise<ExtractResponse> {
    validateInput('extract_content', params as unknown as Record<string, unknown>, this.token);
    const d = parse(
      extractResponse,
      (
        await this.request('/extract', {
          urls: params.urls,
          include_usage: true,
          query: params.query,
          chunks_per_source: params.chunksPerSource,
          extract_depth: params.extractDepth,
          include_images: params.includeImages,
          format: params.format,
          timeout: params.timeout
        })
      ).data
    );
    return {
      results: d.results.map(r => ({
        url: r.url,
        rawContent: r.raw_content,
        images: r.images,
        favicon: r.favicon
      })),
      failedResults: d.failed_results,
      responseTime: d.response_time,
      requestId: d.request_id,
      usageCredits: d.usage?.credits
    };
  }
  async crawl(params: CrawlParams): Promise<CrawlResponse> {
    validateInput('crawl_website', params as unknown as Record<string, unknown>, this.token);
    const d = parse(
      crawlResponse,
      (
        await this.request('/crawl', {
          url: params.url,
          include_usage: true,
          instructions: params.instructions,
          chunks_per_source: params.chunksPerSource,
          max_depth: params.maxDepth,
          max_breadth: params.maxBreadth,
          limit: params.limit,
          select_paths: params.selectPaths,
          select_domains: params.selectDomains,
          exclude_paths: params.excludePaths,
          exclude_domains: params.excludeDomains,
          allow_external: params.allowExternal,
          include_images: params.includeImages,
          extract_depth: params.extractDepth,
          format: params.format,
          timeout: params.timeout
        })
      ).data
    );
    return {
      baseUrl: d.base_url,
      results: d.results.map(r => ({
        url: r.url,
        rawContent: r.raw_content,
        favicon: r.favicon
      })),
      responseTime: d.response_time,
      requestId: d.request_id,
      usageCredits: d.usage?.credits
    };
  }
  async map(params: MapParams): Promise<MapResponse> {
    validateInput('map_website', params as unknown as Record<string, unknown>, this.token);
    const d = parse(
      mapResponse,
      (
        await this.request('/map', {
          url: params.url,
          include_usage: true,
          instructions: params.instructions,
          max_depth: params.maxDepth,
          max_breadth: params.maxBreadth,
          limit: params.limit,
          select_paths: params.selectPaths,
          select_domains: params.selectDomains,
          exclude_paths: params.excludePaths,
          exclude_domains: params.excludeDomains,
          allow_external: params.allowExternal,
          timeout: params.timeout
        })
      ).data
    );
    return {
      baseUrl: d.base_url,
      results: d.results,
      responseTime: d.response_time,
      requestId: d.request_id,
      usageCredits: d.usage?.credits
    };
  }
  async createResearch(params: ResearchParams): Promise<ResearchCreateResponse> {
    validateInput('research', params as unknown as Record<string, unknown>, this.token);
    const response = await this.request('/research', {
      input: params.input,
      model: params.model,
      output_schema: params.outputSchema,
      citation_format: params.citationFormat
    });
    let recoveryId: string | undefined;
    try {
      const raw = response.data as Record<string, unknown>;
      requestId(raw.request_id);
      safeJson(raw.request_id, [this.token]);
      recoveryId = raw.request_id;
      const d = parse(researchCreateResponse, raw);
      requireValue(
        d.input === params.input,
        'Tavily accepted a different research input; reconcile the request before retrying.'
      );
      return {
        requestId: d.request_id,
        status: d.status,
        createdAt: d.created_at,
        input: d.input,
        model: d.model,
        responseTime: d.response_time,
        usageCredits: d.usage?.credits
      };
    } catch (error) {
      const safe = upstream(error);
      if (recoveryId)
        safe.data.reason = `The HTTP 201 receipt included research request ID ${recoveryId}, but its result could not be confirmed. Reconcile this exact ID before creating another job; credits and history may remain.`;
      throw safe;
    }
  }

  async getResearch(id: string, timeout?: number): Promise<ResearchGetResponse> {
    requestId(id);
    safeJson(id, [this.token]);
    const response = await this.request(
        `/research/${encodeURIComponent(id)}`,
        undefined,
        timeout
      ),
      d = parse(researchResponse, response.data);
    requireValue(d.request_id === id, 'Tavily returned another research request.');
    requireValue(
      response.status === 202
        ? ['pending', 'in_progress'].includes(d.status)
        : ['completed', 'failed'].includes(d.status),
      'Tavily research status does not match its HTTP receipt.'
    );
    if (d.status === 'completed')
      requireValue(
        d.content !== undefined && d.sources !== undefined && d.created_at !== undefined,
        'Tavily completed research is missing its result or sources.'
      );
    return {
      requestId: d.request_id,
      status: d.status,
      createdAt: d.created_at,
      content: d.content,
      sources: d.sources,
      responseTime: d.response_time,
      usageCredits: d.usage?.credits
    };
  }
  async getUsage(): Promise<UsageResponse> {
    const d = parse(usageResponse, (await this.request('/usage')).data),
      k = d.key,
      a = d.account;
    return {
      usage: k.usage,
      limit: k.limit,
      searchUsage: k.search_usage,
      extractUsage: k.extract_usage,
      crawlUsage: k.crawl_usage,
      mapUsage: k.map_usage,
      researchUsage: k.research_usage,
      currentPlan: a.current_plan,
      planUsage: a.plan_usage,
      planLimit: a.plan_limit,
      paygoUsage: a.paygo_usage,
      paygoLimit: a.paygo_limit
    };
  }
}
