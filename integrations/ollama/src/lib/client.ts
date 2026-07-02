import { createAxios } from 'slates';

export interface ClientConfig {
  baseUrl: string;
  token?: string;
}

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
  keepAlive?: string;
  think?: boolean;
  options?: ModelOptions;
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
  keepAlive?: string;
  think?: boolean;
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
  modifiedAt: string;
  size: number;
  digest: string;
  details: {
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
  modelfile: string;
  parameters: string;
  template: string;
  system: string;
  license: string;
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
  modelfile?: string;
  from?: string;
  quantize?: string;
  system?: string;
  template?: string;
  parameters?: Record<string, unknown>;
}

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

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers
    });
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
    if (params.options) body.options = mapOptions(params.options);

    let response = await this.axios.post('/api/generate', body);
    let data = response.data;

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
      evalDuration: data.eval_duration
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
    if (params.options) body.options = mapOptions(params.options);

    let response = await this.axios.post('/api/chat', body);
    let data = response.data;

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
      evalDuration: data.eval_duration
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

    let response = await this.axios.post('/api/embed', body);
    let data = response.data;

    return {
      model: data.model,
      embeddings: data.embeddings,
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    let response = await this.axios.get('/api/tags');
    let models = response.data.models || [];
    return models.map((m: any) => ({
      name: m.name,
      model: m.model,
      modifiedAt: m.modified_at,
      size: m.size,
      digest: m.digest,
      details: {
        format: m.details?.format,
        family: m.details?.family,
        families: m.details?.families,
        parameterSize: m.details?.parameter_size,
        quantizationLevel: m.details?.quantization_level
      }
    }));
  }

  async listRunningModels(): Promise<RunningModelInfo[]> {
    let response = await this.axios.get('/api/ps');
    let models = response.data.models || [];
    return models.map((m: any) => ({
      name: m.name,
      model: m.model,
      modifiedAt: m.modified_at,
      size: m.size,
      digest: m.digest,
      details: {
        format: m.details?.format,
        family: m.details?.family,
        families: m.details?.families,
        parameterSize: m.details?.parameter_size,
        quantizationLevel: m.details?.quantization_level
      },
      expiresAt: m.expires_at,
      sizeVram: m.size_vram,
      contextLength: m.context_length
    }));
  }

  async showModel(modelName: string, verbose?: boolean): Promise<ShowModelResponse> {
    let body: Record<string, unknown> = { name: modelName };
    if (verbose) body.verbose = true;

    let response = await this.axios.post('/api/show', body);
    let data = response.data;

    return {
      modelfile: data.modelfile || '',
      parameters: data.parameters || '',
      template: data.template || '',
      system: data.system || '',
      license: data.license || '',
      details: {
        parentModel: data.details?.parent_model,
        format: data.details?.format,
        family: data.details?.family,
        families: data.details?.families,
        parameterSize: data.details?.parameter_size,
        quantizationLevel: data.details?.quantization_level
      },
      modelInfo: data.model_info
    };
  }

  async pullModel(modelName: string, insecure?: boolean): Promise<PullResponse> {
    let body: Record<string, unknown> = {
      name: modelName,
      stream: false
    };
    if (insecure !== undefined) body.insecure = insecure;

    let response = await this.axios.post('/api/pull', body);
    return {
      status: response.data.status,
      digest: response.data.digest,
      total: response.data.total,
      completed: response.data.completed
    };
  }

  async pushModel(modelName: string, insecure?: boolean): Promise<{ status: string }> {
    let body: Record<string, unknown> = {
      name: modelName,
      stream: false
    };
    if (insecure !== undefined) body.insecure = insecure;

    let response = await this.axios.post('/api/push', body);
    return { status: response.data.status };
  }

  async createModel(params: CreateModelParams): Promise<{ status: string }> {
    let body: Record<string, unknown> = {
      model: params.model,
      stream: false
    };
    if (params.modelfile !== undefined) body.modelfile = params.modelfile;
    if (params.from !== undefined) body.from = params.from;
    if (params.quantize !== undefined) body.quantize = params.quantize;
    if (params.system !== undefined) body.system = params.system;
    if (params.template !== undefined) body.template = params.template;
    if (params.parameters !== undefined) body.parameters = params.parameters;

    let response = await this.axios.post('/api/create', body);
    return { status: response.data.status || 'success' };
  }

  async copyModel(source: string, destination: string): Promise<void> {
    await this.axios.post('/api/copy', {
      source,
      destination
    });
  }

  async deleteModel(modelName: string): Promise<void> {
    await this.axios.delete('/api/delete', {
      data: { name: modelName }
    });
  }
}
