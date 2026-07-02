import { createAxios } from 'slates';

let BASE_URL = 'https://api.writer.com/v1';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
};

export type ToolDefinition = {
  type: 'function' | 'graph' | 'llm' | 'translation' | 'vision' | 'web_search';
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
  graph_ids?: string[];
  subqueries?: boolean;
  query_config?: Record<string, unknown>;
  description?: string;
  model?: string;
  include_domains?: string[];
  exclude_domains?: string[];
  formality?: string;
  length_control?: string;
  mask_profanity?: boolean;
};

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
    this.axios = createAxios({
      baseURL: BASE_URL
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
    if (request.tools !== undefined) {
      body.tools = request.tools.map(t => {
        let tool: Record<string, unknown> = { type: t.type };
        if (t.function) tool.function = t.function;
        if (t.graph_ids) tool.graph_ids = t.graph_ids;
        if (t.subqueries !== undefined) tool.subqueries = t.subqueries;
        if (t.query_config) tool.query_config = t.query_config;
        if (t.description) tool.description = t.description;
        if (t.model) tool.model = t.model;
        if (t.include_domains) tool.include_domains = t.include_domains;
        if (t.exclude_domains) tool.exclude_domains = t.exclude_domains;
        if (t.formality) tool.formality = t.formality;
        if (t.length_control) tool.length_control = t.length_control;
        if (t.mask_profanity !== undefined) tool.mask_profanity = t.mask_profanity;
        return tool;
      });
    }
    if (request.toolChoice !== undefined) body.tool_choice = request.toolChoice;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;

    let response = await this.axios.post('/chat', body, {
      headers: this.headers
    });

    let data = response.data;
    return {
      completionId: data.id,
      object: data.object,
      choices: (data.choices || []).map((c: any) => ({
        index: c.index,
        finishReason: c.finish_reason,
        message: {
          role: c.message?.role,
          content: c.message?.content,
          toolCalls: c.message?.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: tc.type,
            function: { name: tc.function.name, arguments: tc.function.arguments }
          })),
          graphData: c.message?.graph_data,
          webSearchData: c.message?.web_search_data
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

    let data = response.data;
    return {
      choices: (data.choices || []).map((c: any) => ({ text: c.text })),
      model: data.model
    };
  }

  // List Models
  async listModels(): Promise<ModelInfo[]> {
    let response = await this.axios.get('/models', {
      headers: this.headers
    });

    let data = response.data;
    let models = data.data || data.models || data || [];
    return (Array.isArray(models) ? models : []).map((m: any) => ({
      modelId: m.id,
      name: m.name || m.id,
      type: m.type || 'unknown'
    }));
  }

  // Knowledge Graphs
  async createGraph(name: string, description?: string): Promise<GraphResponse> {
    let body: Record<string, unknown> = { name };
    if (description) body.description = description;

    let response = await this.axios.post('/graphs', body, {
      headers: this.headers
    });

    let data = response.data;
    return {
      graphId: data.id,
      createdAt: data.created_at,
      name: data.name,
      description: data.description || ''
    };
  }

  async listGraphs(): Promise<GraphResponse[]> {
    let response = await this.axios.get('/graphs', {
      headers: this.headers
    });

    let items = response.data.data || response.data || [];
    return (Array.isArray(items) ? items : []).map((g: any) => ({
      graphId: g.id,
      createdAt: g.created_at,
      name: g.name,
      description: g.description || ''
    }));
  }

  async getGraph(graphId: string): Promise<GraphResponse> {
    let response = await this.axios.get(`/graphs/${graphId}`, {
      headers: this.headers
    });

    let data = response.data;
    return {
      graphId: data.id,
      createdAt: data.created_at,
      name: data.name,
      description: data.description || ''
    };
  }

  async updateGraph(
    graphId: string,
    updates: { name?: string; description?: string }
  ): Promise<GraphResponse> {
    let response = await this.axios.put(`/graphs/${graphId}`, updates, {
      headers: this.headers
    });

    let data = response.data;
    return {
      graphId: data.id,
      createdAt: data.created_at,
      name: data.name,
      description: data.description || ''
    };
  }

  async deleteGraph(graphId: string): Promise<void> {
    await this.axios.delete(`/graphs/${graphId}`, {
      headers: this.headers
    });
  }

  async addFileToGraph(graphId: string, fileId: string): Promise<FileResponse> {
    let response = await this.axios.post(
      `/graphs/${graphId}/file`,
      { file_id: fileId },
      {
        headers: this.headers
      }
    );

    let data = response.data;
    return {
      fileId: data.id,
      name: data.name,
      createdAt: data.created_at,
      graphIds: data.graph_ids || [],
      status: data.status || 'unknown'
    };
  }

  async removeFileFromGraph(graphId: string, fileId: string): Promise<void> {
    await this.axios.delete(`/graphs/${graphId}/file/${fileId}`, {
      headers: this.headers
    });
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

    let data = response.data;
    return {
      question: data.question,
      answer: data.answer,
      sources: (data.sources || []).map((s: any) => ({
        fileId: s.file_id,
        snippets: s.snippets || []
      })),
      subqueries: data.subqueries?.map((sq: any) => ({
        question: sq.question,
        answer: sq.answer
      }))
    };
  }

  // Files
  async uploadFile(
    fileName: string,
    content: string,
    contentType: string,
    graphId?: string
  ): Promise<FileResponse> {
    let url = '/files';
    if (graphId) url += `?graphId=${graphId}`;

    let response = await this.axios.post(url, content, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${fileName}`
      }
    });

    let data = response.data;
    return {
      fileId: data.id,
      name: data.name,
      createdAt: data.created_at,
      graphIds: data.graph_ids || [],
      status: data.status || 'unknown'
    };
  }

  async listFiles(params?: {
    orderBy?: string;
    order?: string;
    offset?: number;
    limit?: number;
  }): Promise<FileResponse[]> {
    let queryParams: Record<string, string> = {};
    if (params?.orderBy) queryParams.order_by = params.orderBy;
    if (params?.order) queryParams.order = params.order;
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/files', {
      headers: this.headers,
      params: queryParams
    });

    let items = response.data.data || response.data || [];
    return (Array.isArray(items) ? items : []).map((f: any) => ({
      fileId: f.id,
      name: f.name,
      createdAt: f.created_at,
      graphIds: f.graph_ids || [],
      status: f.status || 'unknown'
    }));
  }

  async getFile(fileId: string): Promise<FileResponse> {
    let response = await this.axios.get(`/files/${fileId}`, {
      headers: this.headers
    });

    let data = response.data;
    return {
      fileId: data.id,
      name: data.name,
      createdAt: data.created_at,
      graphIds: data.graph_ids || [],
      status: data.status || 'unknown'
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.axios.delete(`/files/${fileId}`, {
      headers: this.headers
    });
  }

  async downloadFile(fileId: string): Promise<string> {
    let response = await this.axios.get(`/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      responseType: 'text'
    });

    return response.data;
  }

  // Applications (No-Code Agents)
  async getApplication(applicationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/applications/${applicationId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async generateFromApplication(
    applicationId: string,
    inputs: Array<{ id: string; value: string[] }>
  ): Promise<ApplicationResponse[]> {
    let response = await this.axios.post(
      `/applications/${applicationId}`,
      {
        inputs
      },
      {
        headers: this.headers
      }
    );

    let data = response.data;
    if (Array.isArray(data)) {
      return data.map((r: any) => ({ title: r.title, suggestion: r.suggestion }));
    }
    return [{ title: data.title || '', suggestion: data.suggestion || '' }];
  }

  async listApplications(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/applications', {
      headers: this.headers,
      params: queryParams
    });

    let items = response.data.data || response.data || [];
    return Array.isArray(items) ? items : [];
  }
}
