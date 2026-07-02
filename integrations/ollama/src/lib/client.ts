import { createAxios } from 'slates';
import { ollamaApiError, ollamaServiceError } from './errors';

export interface ClientConfig {
  baseUrl: string;
  token?: string;
}

export type ThinkMode = boolean | 'high' | 'medium' | 'low';
export type KeepAlive = string | number;

export interface ModelOptions {
  temperature?: number;
  topK?: number;
  topP?: number;
  seed?: number;
  numCtx?: number;
  numPredict?: number;
  stop?: string[];
  repeatPenalty?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  minP?: number;
}

export interface GenerateParams {
  model: string;
  prompt: string;
  suffix?: string;
  system?: string;
  template?: string;
  raw?: boolean;
  images?: string[];
  format?: string | Record<string, unknown>;
  keepAlive?: KeepAlive;
  think?: ThinkMode;
  logprobs?: boolean;
  topLogprobs?: number;
  options?: ModelOptions;
}

export interface LogprobInfo {
  token: string;
  logprob: number;
  bytes?: number[];
  topLogprobs?: Array<{
    token: string;
    logprob: number;
    bytes?: number[];
  }>;
}

export interface GenerateResponse {
  model: string;
  createdAt: string;
  response: string;
  thinking?: string;
  done: boolean;
  doneReason?: string;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  promptEvalDuration?: number;
  evalCount?: number;
  evalDuration?: number;
  logprobs?: LogprobInfo[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  format?: string | Record<string, unknown>;
  keepAlive?: KeepAlive;
  think?: ThinkMode;
  logprobs?: boolean;
  topLogprobs?: number;
  options?: ModelOptions;
}

export interface ChatResponse {
  model: string;
  createdAt: string;
  message: {
    role: string;
    content: string;
    thinking?: string;
    toolCalls?: ToolCall[];
  };
  done: boolean;
  doneReason?: string;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  promptEvalDuration?: number;
  evalCount?: number;
  evalDuration?: number;
  logprobs?: LogprobInfo[];
}

export interface EmbedParams {
  model: string;
  input: string | string[];
  truncate?: boolean;
  dimensions?: number;
  keepAlive?: string;
  options?: ModelOptions;
}

export interface EmbedResponse {
  model: string;
  embeddings: number[][];
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
}

export interface ModelInfo {
  name: string;
  model: string;
  modifiedAt?: string;
  size: number;
  digest: string;
  details: {
    parentModel?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameterSize?: string;
    quantizationLevel?: string;
  };
}

export interface RunningModelInfo extends ModelInfo {
  expiresAt?: string;
  sizeVram?: number;
  contextLength?: number;
}

export interface ShowModelResponse {
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  license?: string;
  modifiedAt?: string;
  capabilities?: string[];
  details: {
    parentModel?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameterSize?: string;
    quantizationLevel?: string;
  };
  modelInfo?: Record<string, unknown>;
}

export interface PullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface CreateModelParams {
  model: string;
  from?: string;
  quantize?: string;
  license?: string | string[];
  system?: string;
  template?: string;
  parameters?: Record<string, unknown>;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let mapOptions = (options?: ModelOptions): Record<string, unknown> | undefined => {
  if (!options) return undefined;
  return {
    temperature: options.temperature,
    top_k: options.topK,
    top_p: options.topP,
    seed: options.seed,
    num_ctx: options.numCtx,
    num_predict: options.numPredict,
    stop: options.stop,
    repeat_penalty: options.repeatPenalty,
    presence_penalty: options.presencePenalty,
    frequency_penalty: options.frequencyPenalty,
    min_p: options.minP
  };
};

let mapLogprobs = (value: unknown): LogprobInfo[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return value.filter(isRecord).map(item => ({
    token: typeof item.token === 'string' ? item.token : '',
    logprob: typeof item.logprob === 'number' ? item.logprob : 0,
    bytes: Array.isArray(item.bytes)
      ? item.bytes.filter((byte): byte is number => typeof byte === 'number')
      : undefined,
    topLogprobs: Array.isArray(item.top_logprobs)
      ? item.top_logprobs.filter(isRecord).map(top => ({
          token: typeof top.token === 'string' ? top.token : '',
          logprob: typeof top.logprob === 'number' ? top.logprob : 0,
          bytes: Array.isArray(top.bytes)
            ? top.bytes.filter((byte): byte is number => typeof byte === 'number')
            : undefined
        }))
      : undefined
  }));
};

let mapMessageToApi = (msg: ChatMessage): Record<string, unknown> => {
  let result: Record<string, unknown> = {
    role: msg.role,
    content: msg.content
  };
  if (msg.images && msg.images.length > 0) {
    result.images = msg.images;
  }
  if (msg.toolCalls && msg.toolCalls.length > 0) {
    result.tool_calls = msg.toolCalls.map(tc => ({
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments
      }
    }));
  }
  return result;
};

let mapModelDetails = (details: any) => ({
  parentModel: details?.parent_model,
  format: details?.format,
  family: details?.family,
  families: details?.families,
  parameterSize: details?.parameter_size,
  quantizationLevel: details?.quantization_level
});

let mapModelInfo = (model: any): ModelInfo => ({
  name: model.name,
  model: model.model,
  modifiedAt: model.modified_at,
  size: model.size,
  digest: model.digest,
  details: mapModelDetails(model.details)
});

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseUrl = config.baseUrl.replace(/\/+$/, '');
    try {
      new URL(baseUrl);
    } catch (error) {
      let serviceError = ollamaServiceError(
        'Ollama baseUrl must be an absolute URL such as http://localhost:11434 or https://ollama.com.'
      );
      if (error instanceof Error) {
        serviceError.setParent(error);
      }
      throw serviceError;
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }
    this.axios = createAxios({
      baseURL: baseUrl,
      headers
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw ollamaApiError(error, operation);
    }
  }

  async generate(params: GenerateParams): Promise<GenerateResponse> {
    let body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      stream: false
    };
    if (params.suffix !== undefined) body.suffix = params.suffix;
    if (params.system !== undefined) body.system = params.system;
    if (params.template !== undefined) body.template = params.template;
    if (params.raw !== undefined) body.raw = params.raw;
    if (params.images !== undefined) body.images = params.images;
    if (params.format !== undefined) body.format = params.format;
    if (params.keepAlive !== undefined) body.keep_alive = params.keepAlive;
    if (params.think !== undefined) body.think = params.think;
    if (params.logprobs !== undefined) body.logprobs = params.logprobs;
    if (params.topLogprobs !== undefined) body.top_logprobs = params.topLogprobs;
    if (params.options) body.options = mapOptions(params.options);

    let data = await this.request<any>('generate response', () =>
      this.axios.post('/api/generate', body)
    );

    return {
      model: data.model,
      createdAt: data.created_at,
      response: data.response || '',
      thinking: data.thinking,
      done: data.done,
      doneReason: data.done_reason,
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count,
      promptEvalDuration: data.prompt_eval_duration,
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
      logprobs: mapLogprobs(data.logprobs)
    };
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    let body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages.map(mapMessageToApi),
      stream: false
    };
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.format !== undefined) body.format = params.format;
    if (params.keepAlive !== undefined) body.keep_alive = params.keepAlive;
    if (params.think !== undefined) body.think = params.think;
    if (params.logprobs !== undefined) body.logprobs = params.logprobs;
    if (params.topLogprobs !== undefined) body.top_logprobs = params.topLogprobs;
    if (params.options) body.options = mapOptions(params.options);

    let data = await this.request<any>('generate chat message', () =>
      this.axios.post('/api/chat', body)
    );

    let message: ChatResponse['message'] = {
      role: data.message?.role || 'assistant',
      content: data.message?.content || ''
    };
    if (data.message?.thinking) {
      message.thinking = data.message.thinking;
    }
    if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
      message.toolCalls = data.message.tool_calls.map((tc: any) => ({
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));
    }

    return {
      model: data.model,
      createdAt: data.created_at,
      message,
      done: data.done,
      doneReason: data.done_reason,
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count,
      promptEvalDuration: data.prompt_eval_duration,
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
      logprobs: mapLogprobs(data.logprobs)
    };
  }

  async embed(params: EmbedParams): Promise<EmbedResponse> {
    let body: Record<string, unknown> = {
      model: params.model,
      input: params.input
    };
    if (params.truncate !== undefined) body.truncate = params.truncate;
    if (params.dimensions !== undefined) body.dimensions = params.dimensions;
    if (params.keepAlive !== undefined) body.keep_alive = params.keepAlive;
    if (params.options) body.options = mapOptions(params.options);

    let data = await this.request<any>('generate embeddings', () =>
      this.axios.post('/api/embed', body)
    );

    return {
      model: data.model,
      embeddings: data.embeddings,
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    let data = await this.request<any>('list models', () => this.axios.get('/api/tags'));
    let models = data.models || [];
    return models.map(mapModelInfo);
  }

  async listRunningModels(): Promise<RunningModelInfo[]> {
    let data = await this.request<any>('list running models', () => this.axios.get('/api/ps'));
    let models = data.models || [];
    return models.map((m: any) => ({
      ...mapModelInfo(m),
      expiresAt: m.expires_at,
      sizeVram: m.size_vram,
      contextLength: m.context_length
    }));
  }

  async showModel(modelName: string, verbose?: boolean): Promise<ShowModelResponse> {
    let body: Record<string, unknown> = { model: modelName };
    if (verbose) body.verbose = true;

    let data = await this.request<any>('show model details', () =>
      this.axios.post('/api/show', body)
    );

    return {
      modelfile: data.modelfile,
      parameters: data.parameters,
      template: data.template,
      system: data.system,
      license: data.license,
      modifiedAt: data.modified_at,
      capabilities: data.capabilities,
      details: mapModelDetails(data.details),
      modelInfo: data.model_info
    };
  }

  async pullModel(modelName: string, insecure?: boolean): Promise<PullResponse> {
    let body: Record<string, unknown> = {
      model: modelName,
      stream: false
    };
    if (insecure !== undefined) body.insecure = insecure;

    let data = await this.request<any>('pull model', () => this.axios.post('/api/pull', body));
    return {
      status: data.status,
      digest: data.digest,
      total: data.total,
      completed: data.completed
    };
  }

  async pushModel(modelName: string, insecure?: boolean): Promise<{ status: string }> {
    let body: Record<string, unknown> = {
      model: modelName,
      stream: false
    };
    if (insecure !== undefined) body.insecure = insecure;

    let data = await this.request<any>('push model', () => this.axios.post('/api/push', body));
    return { status: data.status };
  }

  async createModel(params: CreateModelParams): Promise<{ status: string }> {
    let body: Record<string, unknown> = {
      model: params.model,
      stream: false
    };
    if (params.from !== undefined) body.from = params.from;
    if (params.quantize !== undefined) body.quantize = params.quantize;
    if (params.license !== undefined) body.license = params.license;
    if (params.system !== undefined) body.system = params.system;
    if (params.template !== undefined) body.template = params.template;
    if (params.parameters !== undefined) body.parameters = params.parameters;
    if (params.messages !== undefined) body.messages = params.messages;

    let data = await this.request<any>('create model', () =>
      this.axios.post('/api/create', body)
    );
    return { status: data.status || 'success' };
  }

  async copyModel(source: string, destination: string): Promise<void> {
    await this.request('copy model', () =>
      this.axios.post('/api/copy', {
        source,
        destination
      })
    );
  }

  async deleteModel(modelName: string): Promise<void> {
    await this.request('delete model', () =>
      this.axios.delete('/api/delete', {
        data: { model: modelName }
      })
    );
  }

  async getVersion(): Promise<{ version: string }> {
    return await this.request('get version', () => this.axios.get('/api/version'));
  }
}
