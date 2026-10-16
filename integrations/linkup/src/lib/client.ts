import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import type { ResearchTask } from './schemas';

interface SourceFilters {
  fromDate?: string;
  toDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface SearchParams extends SourceFilters {
  query: string;
  depth: 'standard' | 'deep';
  outputType: 'sourcedAnswer' | 'searchResults' | 'structured';
  structuredOutputSchema?: string;
  maxResults?: number;
  includeImages?: boolean;
  includeInlineCitations?: boolean;
  includeSources?: boolean;
}

export interface FetchParams {
  url: string;
  includeRawHtml?: boolean;
  renderJs?: boolean;
  extractImages?: boolean;
  includeRawContent?: boolean;
  mode?: 'standard' | 'pro';
  schema?: string;
  instructions?: string;
}

export interface FetchResult extends Record<string, unknown> {
  url: string;
  content: string;
  markdown: string;
  favicon?: string;
  rawHtml?: string;
  rawContent?: string;
  contentType?: string;
  data?: Record<string, unknown>;
  images?: { url: string; alt?: string; description?: string }[];
}

export interface ResearchParams extends SourceFilters {
  query: string;
  outputType: 'sourcedAnswer' | 'structured';
  structuredOutputSchema?: string;
  mode?: 'answer' | 'auto' | 'investigate' | 'research';
  reasoningDepth?: 'S' | 'M' | 'L' | 'XL';
}

export interface ResearchListParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

export interface ResearchList extends Record<string, unknown> {
  data: ResearchTask[];
  metadata: { page: number; pageSize: number; total: number; totalPages: number };
}

let validateObjectSchema = (value: string, field: string) => {
  let schema: unknown;
  try {
    schema = JSON.parse(value);
  } catch {
    throw createApiServiceError(`${field} must contain valid JSON.`);
  }
  if (!isApiErrorRecord(schema) || schema.type !== 'object') {
    throw createApiServiceError(`${field} must be a JSON Schema with root type "object".`);
  }
};

let validateSourceFilters = (params: SourceFilters) => {
  for (let [field, date] of [
    ['fromDate', params.fromDate],
    ['toDate', params.toDate]
  ]) {
    if (date === undefined) continue;
    let parsed = new Date(`${date}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date ||
      date <= '1970-01-01'
    ) {
      throw createApiServiceError(
        `${field} must be a valid YYYY-MM-DD date after 1970-01-01.`
      );
    }
  }
  if (params.fromDate && params.toDate && params.fromDate >= params.toDate) {
    throw createApiServiceError('fromDate must be earlier than toDate.');
  }
  if (params.includeDomains && params.includeDomains.length > 100) {
    throw createApiServiceError('includeDomains supports at most 100 domains.');
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Linkup API key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.linkup.so/v1',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      timeout: 180_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Linkup',
          reason: 'linkup_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          nestedKeys: ['error', 'details']
        })
    });
  }

  async search(params: SearchParams): Promise<Record<string, unknown>> {
    if (!params.query.trim()) throw createApiServiceError('Search query must not be empty.');
    validateSourceFilters(params);
    if (params.outputType === 'structured') {
      if (!params.structuredOutputSchema) {
        throw createApiServiceError(
          'structuredOutputSchema is required for structured output.'
        );
      }
      validateObjectSchema(params.structuredOutputSchema, 'structuredOutputSchema');
    }
    if (params.includeInlineCitations && params.outputType !== 'sourcedAnswer') {
      throw createApiServiceError('includeInlineCitations requires sourcedAnswer output.');
    }
    if (params.includeSources && params.outputType !== 'structured') {
      throw createApiServiceError('includeSources requires structured output.');
    }
    if (params.maxResults !== undefined && params.maxResults < 1) {
      throw createApiServiceError('maxResults must be at least 1.');
    }
    let { query, ...options } = params;
    let response = await this.axios.post<Record<string, unknown>>(
      '/search',
      pickDefined({ q: query, ...options })
    );
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('Linkup returned an invalid search response.');
    }
    return response.data;
  }

  async fetchWebpage(params: FetchParams): Promise<FetchResult> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(params.url);
    } catch {
      throw createApiServiceError('Enter a valid HTTP or HTTPS webpage URL.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw createApiServiceError('Enter a valid HTTP or HTTPS webpage URL.');
    }
    if (params.instructions !== undefined && !params.schema) {
      throw createApiServiceError('Provide schema when using extraction instructions.');
    }
    if (params.schema !== undefined) validateObjectSchema(params.schema, 'schema');

    let response = await this.axios.post<FetchResult>('/fetch', pickDefined(params));
    if (!isApiErrorRecord(response.data) || typeof response.data.markdown !== 'string') {
      throw createApiServiceError(
        'Linkup returned a fetch response without markdown content.'
      );
    }
    return {
      ...response.data,
      url: params.url,
      content: response.data.markdown,
      images: response.data.images?.map(image => ({
        ...image,
        description: image.description ?? image.alt
      }))
    };
  }

  async getCreditBalance(): Promise<{ balance: number; remainingCredits: number }> {
    let response = await this.axios.get<{ balance: number }>('/credits/balance');
    if (!isApiErrorRecord(response.data) || typeof response.data.balance !== 'number') {
      throw createApiServiceError(
        'Linkup returned a credit response without a numeric balance.'
      );
    }
    return { ...response.data, remainingCredits: response.data.balance };
  }

  async createResearch(params: ResearchParams): Promise<ResearchTask> {
    if (!params.query.trim()) throw createApiServiceError('Research query must not be empty.');
    validateSourceFilters(params);
    if (params.outputType === 'structured') {
      if (!params.structuredOutputSchema) {
        throw createApiServiceError(
          'structuredOutputSchema is required for structured output.'
        );
      }
      validateObjectSchema(params.structuredOutputSchema, 'structuredOutputSchema');
    }
    let { query, ...options } = params;
    let response = await this.axios.post<ResearchTask>(
      '/research',
      pickDefined({ q: query, ...options })
    );
    return response.data;
  }

  async getResearch(researchId: string): Promise<ResearchTask> {
    if (!researchId.trim()) throw createApiServiceError('Provide a research task ID.');
    let response = await this.axios.get<ResearchTask>(
      `/research/${encodeURIComponent(researchId)}`
    );
    return response.data;
  }

  async listResearch(params: ResearchListParams): Promise<ResearchList> {
    let response = await this.axios.get<ResearchList>('/research', {
      params: pickDefined(params)
    });
    return response.data;
  }
}
