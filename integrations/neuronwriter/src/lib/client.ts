import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let BASE_URL = 'https://app.neuronwriter.com/neuron-api/0.5/writer';

let projectSchema = z.object({
  project: z.string(),
  name: z.string(),
  language: z.string(),
  engine: z.string()
});

let createQuerySchema = z.object({
  query: z.string(),
  query_url: z.string(),
  share_url: z.string(),
  readonly_url: z.string()
});

let querySchema = z
  .object({
    status: z.string(),
    query: z.string().optional(),
    keyword: z.string().optional(),
    language: z.string().optional(),
    engine: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
    terms_txt: z.record(z.string(), z.unknown()).optional(),
    terms: z.record(z.string(), z.unknown()).optional(),
    ideas: z.record(z.string(), z.unknown()).optional(),
    competitors: z.array(z.unknown()).optional(),
    entities: z.array(z.unknown()).optional()
  })
  .passthrough();

let queryListItemSchema = z.object({
  query: z.string(),
  keyword: z.string().optional(),
  language: z.string().optional(),
  engine: z.string().optional(),
  status: z.string().optional(),
  source: z.string(),
  tags: z.array(z.string()).optional(),
  created: z.string(),
  updated: z.string(),
  query_url: z.string().optional(),
  share_url: z.string().optional(),
  readonly_url: z.string().optional()
});

let contentSchema = z.object({
  content: z.string(),
  title: z.string(),
  description: z.string(),
  created: z.string(),
  type: z.string()
});

let contentResultSchema = z.object({
  status: z.string(),
  content_score: z.number().optional(),
  score: z.number().optional(),
  error: z.string().optional()
});

export class NeuronWriterClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A NeuronWriter API key is required. Reconnect with an API key.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-API-KEY', value: token },
      headers: { Accept: 'application/json' },
      timeout: 60000
    });
  }

  private async request<T>(path: string, schema: z.ZodType<T>, body: object = {}): Promise<T> {
    let response = await requestAxiosData<unknown>(
      path,
      () => this.axios.post(path, pickDefined(body)),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'NeuronWriter',
          reason: 'neuronwriter_api_error',
          operation
        })
    );

    if (
      isApiErrorRecord(response) &&
      ((response.error !== undefined && response.error !== null && response.error !== '') ||
        response.status === 'error' ||
        response.status === 'failed' ||
        ((path === '/import-content' || path === '/evaluate-content') &&
          response.status !== 'ok'))
    ) {
      throw buildApiServiceError(
        { response: { data: response, status: 200 } },
        {
          providerLabel: 'NeuronWriter',
          reason: 'neuronwriter_api_error',
          operation: path,
          fallbackMessage: 'The provider could not complete the operation.'
        }
      );
    }

    let parsed = schema.safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError(`NeuronWriter returned an invalid response for ${path}.`, {
        reason: 'neuronwriter_invalid_response'
      });
    }
    return parsed.data;
  }

  async listProjects(): Promise<NeuronProject[]> {
    return this.request('/list-projects', z.array(projectSchema));
  }

  async createQuery(params: CreateQueryParams): Promise<CreateQueryResponse> {
    return this.request('/new-query', createQuerySchema, params);
  }

  async getQuery(queryId: string): Promise<GetQueryResponse> {
    return this.request('/get-query', querySchema, { query: queryId });
  }

  async listQueries(params: ListQueriesParams): Promise<QueryListItem[]> {
    return this.request('/list-queries', z.array(queryListItemSchema), params);
  }

  async getContent(queryId: string, revisionType?: string): Promise<GetContentResponse> {
    return this.request('/get-content', contentSchema, {
      query: queryId,
      revision_type: revisionType
    });
  }

  async importContent(params: ImportContentParams): Promise<ImportContentResponse> {
    return this.request('/import-content', contentResultSchema, this.contentBody(params));
  }

  async evaluateContent(params: EvaluateContentParams): Promise<EvaluateContentResponse> {
    return this.request('/evaluate-content', contentResultSchema, this.contentBody(params));
  }

  private contentBody(params: ImportContentParams): Record<string, unknown> {
    let hasHtml = params.html !== undefined;
    let hasUrl = params.url !== undefined;
    if (hasHtml === hasUrl) {
      throw createApiServiceError('Provide exactly one of html or sourceUrl.');
    }
    if (hasHtml && !params.html?.trim()) {
      throw createApiServiceError('Provide non-empty HTML content.');
    }
    if (hasUrl) {
      let url = z.url({ protocol: /^https?$/ }).safeParse(params.url);
      if (!url.success) {
        throw createApiServiceError('sourceUrl must be a valid HTTP or HTTPS URL.');
      }
    } else if (params.containerId !== undefined || params.containerClass !== undefined) {
      throw createApiServiceError('containerId and containerClass require sourceUrl.');
    }

    return pickDefined({
      query: params.queryId,
      html: params.html,
      url: params.url,
      title: params.title,
      description: params.description,
      id: params.containerId,
      class: params.containerClass
    });
  }
}

export interface NeuronProject {
  project: string;
  name: string;
  language: string;
  engine: string;
}

export interface CreateQueryParams {
  project: string;
  keyword: string;
  engine: string;
  language: string;
  additional_keywords?: string[];
  competitors_mode?: string;
}

export interface CreateQueryResponse {
  query: string;
  query_url: string;
  share_url: string;
  readonly_url: string;
}

export interface GetQueryResponse {
  status: string;
  query?: string;
  keyword?: string;
  language?: string;
  engine?: string;
  tags?: string[];
  created?: string;
  updated?: string;
  metrics?: Record<string, unknown>;
  terms_txt?: Record<string, unknown>;
  terms?: Record<string, unknown>;
  ideas?: Record<string, unknown>;
  competitors?: unknown[];
  entities?: unknown[];
}

export interface ListQueriesParams {
  project: string;
  status?: string;
  source?: string;
  created?: string;
  updated?: string;
  keyword?: string;
  language?: string;
  engine?: string;
  tags?: string | string[];
}

export interface QueryListItem {
  query: string;
  keyword?: string;
  language?: string;
  engine?: string;
  status?: string;
  source: string;
  tags?: string[];
  created: string;
  updated: string;
  query_url?: string;
  share_url?: string;
  readonly_url?: string;
}

export interface GetContentResponse {
  content: string;
  title: string;
  description: string;
  created: string;
  type: string;
}

export interface ImportContentParams {
  queryId: string;
  html?: string;
  url?: string;
  title?: string;
  description?: string;
  containerId?: string;
  containerClass?: string;
}

export interface ImportContentResponse {
  status: string;
  content_score?: number;
  score?: number;
  error?: string;
}

export interface EvaluateContentParams {
  queryId: string;
  html?: string;
  url?: string;
  title?: string;
  description?: string;
  containerId?: string;
  containerClass?: string;
}

export interface EvaluateContentResponse {
  status: string;
  content_score?: number;
  score?: number;
  error?: string;
}
