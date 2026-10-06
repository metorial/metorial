import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.writer.com/v1';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
};

export type ToolDefinition = {
  type: 'function' | 'graph' | 'web_search';
  function: Record<string, unknown>;
};

export type PaginationRequest = {
  before?: string;
  after?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  offset?: number;
};

export type Page<T> = {
  data: T[];
  hasMore: boolean;
  firstId?: string;
  lastId?: string;
};

type ApiPage<T> = {
  data: T[];
  has_more: boolean;
  first_id?: string | null;
  last_id?: string | null;
};

type ApiGraph = {
  id: string;
  created_at: string;
  name: string;
  description?: string | null;
  file_status?: { in_progress: number; completed: number; failed: number; total: number };
};
type ApiFile = {
  id: string;
  name: string;
  created_at: string;
  graph_ids?: string[];
  graph_id?: string[];
  status?: string;
};

let mapGraph = (data: ApiGraph): GraphResponse => ({
  graphId: data.id,
  createdAt: data.created_at,
  name: data.name,
  description: data.description ?? '',
  fileStatus: data.file_status
});

let mapFile = (data: ApiFile): FileResponse => ({
  fileId: data.id,
  name: data.name,
  createdAt: data.created_at,
  graphIds: data.graph_ids ?? data.graph_id ?? [],
  status: data.status ?? 'unknown'
});

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  n?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: string | Record<string, unknown>;
  responseFormat?: Record<string, unknown>;
  logprobs?: boolean;
};

export type ChatChoice = {
  index: number;
  finishReason: string;
  message: {
    role: string;
    content: string | null;
    toolCalls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>;
    graphData?: Record<string, unknown>;
    webSearchData?: Record<string, unknown>;
    refusal?: string | null;
  };
};

export type ChatCompletionResponse = {
  completionId: string;
  object: string;
  choices: ChatChoice[];
  created: number;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type TextCompletionRequest = {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string | string[];
  bestOf?: number;
  randomSeed?: number;
  stream?: boolean;
};

export type TextCompletionChoice = {
  text: string;
};

export type TextCompletionResponse = {
  choices: TextCompletionChoice[];
  model: string;
};

export type GraphResponse = {
  graphId: string;
  createdAt: string;
  name: string;
  description: string;
  fileStatus?: { in_progress: number; completed: number; failed: number; total: number };
};

export type GraphQuestionRequest = {
  graphIds: string[];
  question: string;
  subqueries?: boolean;
  queryConfig?: {
    maxSubquestions?: number;
    searchWeight?: number;
    groundingLevel?: number;
    maxSnippets?: number;
    maxTokens?: number;
    inlineCitations?: boolean;
    keywordThreshold?: number;
    semanticThreshold?: number;
  };
};

export type GraphQuestionResponse = {
  question: string;
  answer: string;
  sources: Array<{
    fileId: string;
    snippets: string[];
  }>;
  references?: Record<string, unknown>;
  subqueries?: Array<{
    question: string;
    answer: string;
  }>;
};

export type FileResponse = {
  fileId: string;
  name: string;
  createdAt: string;
  graphIds: string[];
  status: string;
};

export type ApplicationResponse = {
  title: string;
  suggestion: string;
};

export type ModelInfo = {
  modelId: string;
  name: string;
  type: string;
};

export class WriterClient {
  private axios;

  constructor(private token: string) {
    if (!token?.trim())
      throw createApiServiceError(
        'A Writer API key is required. Reconnect with a valid API key.'
      );
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      timeout: 120_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Writer',
          reason: 'writer_api_error'
        })
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Chat Completions
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.n !== undefined) body.n = request.n;
    if (request.stop !== undefined) body.stop = request.stop;
    if (request.stream !== undefined) body.stream = request.stream;
    if (request.logprobs !== undefined) body.logprobs = request.logprobs;
    if (request.tools !== undefined) body.tools = request.tools;
    if (request.toolChoice !== undefined) body.tool_choice = request.toolChoice;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;

    let response = await this.axios.post('/chat', body, {
      headers: this.headers
    });

    let data: {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        finish_reason: string;
        message: {
          role: string;
          content: string | null;
          tool_calls?: ChatMessage['tool_calls'] | null;
          graph_data?: Record<string, unknown> | null;
          web_search_data?: Record<string, unknown> | null;
          refusal?: string | null;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    } = response.data;
    return {
      completionId: data.id,
      object: data.object,
      choices: (data.choices || []).map(c => ({
        index: c.index,
        finishReason: c.finish_reason,
        message: {
          role: c.message?.role,
          content: c.message?.content,
          toolCalls: c.message?.tool_calls?.map(tc => ({
            id: tc.id,
            type: tc.type,
            function: { name: tc.function.name, arguments: tc.function.arguments }
          })),
          graphData: c.message?.graph_data ?? undefined,
          webSearchData: c.message?.web_search_data ?? undefined,
          refusal: c.message?.refusal
        }
      })),
      created: data.created,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  // Text Completions
  async textCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stop !== undefined) body.stop = request.stop;
    if (request.bestOf !== undefined) body.best_of = request.bestOf;
    if (request.randomSeed !== undefined) body.random_seed = request.randomSeed;
    if (request.stream !== undefined) body.stream = request.stream;

    let response = await this.axios.post('/completions', body, {
      headers: this.headers
    });

    let data: { choices: Array<{ text: string }>; model?: string } = response.data;
    return {
      choices: (data.choices || []).map(c => ({ text: c.text })),
      model: data.model ?? request.model
    };
  }

  // List Models
  async listModels(): Promise<ModelInfo[]> {
    let response = await this.axios.get('/models', {
      headers: this.headers
    });

    let data: { models: Array<{ id: string; name?: string; type?: string }> } = response.data;
    let models = data.models;
    return (Array.isArray(models) ? models : []).map(m => ({
      modelId: m.id,
      name: m.name || m.id,
      type: m.type || 'unknown'
    }));
  }

  // Knowledge Graphs
  async createGraph(name: string, description?: string): Promise<GraphResponse> {
    let body: Record<string, unknown> = { name };
    if (description !== undefined) body.description = description;

    let response = await this.axios.post('/graphs', body, {
      headers: this.headers
    });

    return mapGraph(response.data);
  }

  async listGraphs(
    params: PaginationRequest & { teamIds?: number[] } = {}
  ): Promise<Page<GraphResponse>> {
    let page = await this.listPage<ApiGraph>('/graphs', params, { team_ids: params.teamIds });
    return { ...page, data: page.data.map(mapGraph) };
  }

  async getGraph(graphId: string): Promise<GraphResponse> {
    let response = await this.axios.get(`/graphs/${encodeURIComponent(graphId)}`, {
      headers: this.headers
    });

    return mapGraph(response.data);
  }

  async updateGraph(
    graphId: string,
    updates: { name?: string; description?: string }
  ): Promise<GraphResponse> {
    let response = await this.axios.put(`/graphs/${encodeURIComponent(graphId)}`, updates, {
      headers: this.headers
    });

    return mapGraph(response.data);
  }

  async deleteGraph(graphId: string): Promise<void> {
    let response = await this.axios.delete(`/graphs/${encodeURIComponent(graphId)}`, {
      headers: this.headers
    });
    if (response.data.deleted !== true)
      throw createApiServiceError(
        'Writer did not confirm that the Knowledge Graph was deleted. Retrieve the graph to check its status.'
      );
  }

  async addFileToGraph(graphId: string, fileId: string): Promise<FileResponse> {
    let response = await this.axios.post(
      `/graphs/${encodeURIComponent(graphId)}/file`,
      { file_id: fileId },
      {
        headers: this.headers
      }
    );

    return mapFile(response.data);
  }

  async removeFileFromGraph(graphId: string, fileId: string): Promise<void> {
    let response = await this.axios.delete(
      `/graphs/${encodeURIComponent(graphId)}/file/${encodeURIComponent(fileId)}`,
      {
        headers: this.headers
      }
    );
    if (response.data.deleted !== true)
      throw createApiServiceError(
        'Writer did not confirm that the file was removed from the Knowledge Graph. Retrieve the file to check its graph associations.'
      );
  }

  async queryGraph(request: GraphQuestionRequest): Promise<GraphQuestionResponse> {
    let body: Record<string, unknown> = {
      graph_ids: request.graphIds,
      question: request.question
    };
    if (request.subqueries !== undefined) body.subqueries = request.subqueries;
    if (request.queryConfig) {
      let qc: Record<string, unknown> = {};
      if (request.queryConfig.maxSubquestions !== undefined)
        qc.max_subquestions = request.queryConfig.maxSubquestions;
      if (request.queryConfig.searchWeight !== undefined)
        qc.search_weight = request.queryConfig.searchWeight;
      if (request.queryConfig.groundingLevel !== undefined)
        qc.grounding_level = request.queryConfig.groundingLevel;
      if (request.queryConfig.maxSnippets !== undefined)
        qc.max_snippets = request.queryConfig.maxSnippets;
      if (request.queryConfig.maxTokens !== undefined)
        qc.max_tokens = request.queryConfig.maxTokens;
      if (request.queryConfig.inlineCitations !== undefined)
        qc.inline_citations = request.queryConfig.inlineCitations;
      if (request.queryConfig.keywordThreshold !== undefined)
        qc.keyword_threshold = request.queryConfig.keywordThreshold;
      if (request.queryConfig.semanticThreshold !== undefined)
        qc.semantic_threshold = request.queryConfig.semanticThreshold;
      body.query_config = qc;
    }

    let response = await this.axios.post('/graphs/question', body, {
      headers: this.headers
    });

    let data: {
      question: string;
      answer: string;
      sources: Array<{ file_id: string; snippet?: string; snippets?: string[] } | null>;
      subqueries?: Array<{ query: string; question?: string; answer: string } | null> | null;
      references?: Record<string, unknown> | null;
    } = response.data;
    return {
      question: data.question,
      answer: data.answer,
      sources: (data.sources || [])
        .filter(s => s !== null)
        .map(s => ({
          fileId: s.file_id,
          snippets: s.snippet !== undefined ? [s.snippet] : (s.snippets ?? [])
        })),
      references: data.references ?? undefined,
      subqueries: data.subqueries
        ?.filter(sq => sq !== null)
        .map(sq => ({
          question: sq.query ?? sq.question ?? '',
          answer: sq.answer
        }))
    };
  }

  // Files
  async uploadFile(
    fileName: string,
    content: Uint8Array,
    contentType: string,
    graphId?: string
  ): Promise<FileResponse> {
    let url = '/files';

    let response = await this.axios.post(url, content, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(content.byteLength)
      },
      params: pickDefined({ graphId })
    });

    return mapFile(response.data);
  }

  async listFiles(
    params: PaginationRequest & {
      orderBy?: string;
      graphId?: string;
      status?: string;
      fileTypes?: string;
    } = {}
  ): Promise<Page<FileResponse>> {
    if (params.orderBy === 'name') {
      throw createApiServiceError(
        'Writer files are ordered by creation time. Omit orderBy or use created_at.'
      );
    }
    let page = await this.listPage<ApiFile>('/files', params, {
      graph_id: params.graphId,
      status: params.status,
      file_types: params.fileTypes
    });
    return { ...page, data: page.data.map(mapFile) };
  }

  async getFile(fileId: string): Promise<FileResponse> {
    let response = await this.axios.get(`/files/${encodeURIComponent(fileId)}`, {
      headers: this.headers
    });

    return mapFile(response.data);
  }

  async deleteFile(fileId: string): Promise<void> {
    let response = await this.axios.delete(`/files/${encodeURIComponent(fileId)}`, {
      headers: this.headers
    });
    if (response.data.deleted !== true)
      throw createApiServiceError(
        'Writer did not confirm that the file was deleted. Retrieve the file to check its status.'
      );
  }

  async downloadFile(fileId: string): Promise<string> {
    let response = await this.axios.get(`/files/${encodeURIComponent(fileId)}/download`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      responseType: 'text'
    });

    return response.data;
  }

  // Applications (No-Code Agents)
  async getApplication(applicationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/applications/${encodeURIComponent(applicationId)}`, {
      headers: this.headers
    });

    return response.data;
  }

  async generateFromApplication(
    applicationId: string,
    inputs: Array<{ id: string; value: string[] }>
  ): Promise<ApplicationResponse[]> {
    let response = await this.axios.post(
      `/applications/${encodeURIComponent(applicationId)}`,
      {
        inputs
      },
      {
        headers: this.headers
      }
    );

    let data = response.data;
    if (Array.isArray(data)) {
      return data.map((r: ApplicationResponse) => ({
        title: r.title ?? '',
        suggestion: r.suggestion
      }));
    }
    return [{ title: data.title || '', suggestion: data.suggestion || '' }];
  }

  async listApplications(
    params: PaginationRequest = {}
  ): Promise<Page<Record<string, unknown>>> {
    return this.listPage('/applications', params);
  }

  private async listPage<T extends { id?: unknown }>(
    path: string,
    params: PaginationRequest,
    filters: Record<string, unknown> = {}
  ): Promise<Page<T>> {
    if (params.before && params.after) {
      throw createApiServiceError('Specify either before or after, not both.');
    }
    if (params.offset && (params.before || params.after)) {
      throw createApiServiceError('Use offset or cursor pagination, not both.');
    }
    let remaining = params.offset ?? 0;
    let after = params.after;
    // Preserve legacy offset calls by walking the provider's cursor pages.
    while (remaining > 0) {
      let response = await this.axios.get<ApiPage<T>>(path, {
        params: pickDefined({
          ...filters,
          order: params.order,
          after,
          limit: Math.min(remaining, 100)
        }),
        paramsSerializer: { indexes: null }
      });
      let page = response.data;
      remaining -= page.data.length;
      if (!page.has_more || !page.data.length) return { data: [], hasMore: false };
      let next = page.last_id ?? page.data.at(-1)?.id;
      if (typeof next !== 'string' || next === after) {
        throw createApiServiceError(
          'Writer returned an invalid pagination cursor. Retry the list operation.'
        );
      }
      after = next;
    }
    let response = await this.axios.get<ApiPage<T>>(path, {
      params: pickDefined({
        ...filters,
        order: params.order,
        before: params.before,
        after,
        limit: params.limit
      }),
      paramsSerializer: { indexes: null }
    });
    let page = response.data;
    return {
      data: page.data,
      hasMore: page.has_more,
      firstId: page.first_id ?? undefined,
      lastId: page.last_id ?? undefined
    };
  }
}
