import { createAxios } from 'slates';

let BASE_URL = 'https://api.groq.com/openai/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content:
    | string
    | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxCompletionTokens?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: string | { type: string; function: { name: string } };
  parallelToolCalls?: boolean;
  responseFormat?: Record<string, unknown>;
  seed?: number;
  reasoningFormat?: string;
  reasoningEffort?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    reasoning?: string | null;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active: boolean;
  context_window: number;
  max_completion_tokens?: number;
}

export interface ModelsListResponse {
  object: string;
  data: ModelInfo[];
}

export interface TranscriptionRequest {
  fileUrl: string;
  model: string;
  language?: string;
  prompt?: string;
  responseFormat?: string;
  temperature?: number;
  timestampGranularities?: string[];
}

export interface TranslationRequest {
  fileUrl: string;
  model: string;
  prompt?: string;
  responseFormat?: string;
  temperature?: number;
}

export interface SpeechRequest {
  model: string;
  input: string;
  voice: string;
  responseFormat?: string;
  sampleRate?: number;
  speed?: number;
}

export interface BatchRequest {
  inputFileId: string;
  endpoint: string;
  completionWindow: string;
  metadata?: Record<string, string>;
}

export interface BatchInfo {
  id: string;
  object: string;
  endpoint: string;
  errors: unknown;
  input_file_id: string;
  completion_window: string;
  status: string;
  output_file_id?: string;
  error_file_id?: string;
  created_at: number;
  in_progress_at?: number;
  expires_at?: number;
  finalizing_at?: number;
  completed_at?: number;
  failed_at?: number;
  expired_at?: number;
  cancelling_at?: number;
  cancelled_at?: number;
  request_counts?: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: Record<string, string>;
}

export interface BatchListResponse {
  object: string;
  data: BatchInfo[];
  has_more?: boolean;
}

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages
    };

    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.topP !== undefined) body.top_p = req.topP;
    if (req.maxCompletionTokens !== undefined)
      body.max_completion_tokens = req.maxCompletionTokens;
    if (req.stop !== undefined) body.stop = req.stop;
    if (req.stream !== undefined) body.stream = req.stream;
    if (req.tools !== undefined) body.tools = req.tools;
    if (req.toolChoice !== undefined) body.tool_choice = req.toolChoice;
    if (req.parallelToolCalls !== undefined) body.parallel_tool_calls = req.parallelToolCalls;
    if (req.responseFormat !== undefined) body.response_format = req.responseFormat;
    if (req.seed !== undefined) body.seed = req.seed;
    if (req.reasoningFormat !== undefined) body.reasoning_format = req.reasoningFormat;
    if (req.reasoningEffort !== undefined) body.reasoning_effort = req.reasoningEffort;

    let response = await this.axios.post('/chat/completions', body);
    return response.data;
  }

  async listModels(): Promise<ModelsListResponse> {
    let response = await this.axios.get('/models');
    return response.data;
  }

  async getModel(modelId: string): Promise<ModelInfo> {
    let response = await this.axios.get(`/models/${modelId}`);
    return response.data;
  }

  async transcribeAudio(
    req: TranscriptionRequest
  ): Promise<{ text: string; [key: string]: unknown }> {
    let body: Record<string, unknown> = {
      model: req.model,
      url: req.fileUrl
    };

    if (req.language) body.language = req.language;
    if (req.prompt) body.prompt = req.prompt;
    if (req.responseFormat) body.response_format = req.responseFormat;
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.timestampGranularities)
      body['timestamp_granularities[]'] = req.timestampGranularities;

    let response = await this.axios.post('/audio/transcriptions', body);
    return response.data;
  }

  async translateAudio(
    req: TranslationRequest
  ): Promise<{ text: string; [key: string]: unknown }> {
    let body: Record<string, unknown> = {
      model: req.model,
      url: req.fileUrl
    };

    if (req.prompt) body.prompt = req.prompt;
    if (req.responseFormat) body.response_format = req.responseFormat;
    if (req.temperature !== undefined) body.temperature = req.temperature;

    let response = await this.axios.post('/audio/translations', body);
    return response.data;
  }

  async createSpeech(req: SpeechRequest): Promise<string> {
    let body: Record<string, unknown> = {
      model: req.model,
      input: req.input,
      voice: req.voice
    };

    if (req.responseFormat) body.response_format = req.responseFormat;
    if (req.sampleRate !== undefined) body.sample_rate = req.sampleRate;
    if (req.speed !== undefined) body.speed = req.speed;

    let response = await this.axios.post('/audio/speech', body, {
      responseType: 'arraybuffer'
    });

    // Return base64 encoded audio

    let buffer = Buffer.from(response.data);
    return buffer.toString('base64');
  }

  async createBatch(req: BatchRequest): Promise<BatchInfo> {
    let body: Record<string, unknown> = {
      input_file_id: req.inputFileId,
      endpoint: req.endpoint,
      completion_window: req.completionWindow
    };

    if (req.metadata) body.metadata = req.metadata;

    let response = await this.axios.post('/batches', body);
    return response.data;
  }

  async getBatch(batchId: string): Promise<BatchInfo> {
    let response = await this.axios.get(`/batches/${batchId}`);
    return response.data;
  }

  async listBatches(): Promise<BatchListResponse> {
    let response = await this.axios.get('/batches');
    return response.data;
  }

  async cancelBatch(batchId: string): Promise<BatchInfo> {
    let response = await this.axios.post(`/batches/${batchId}/cancel`);
    return response.data;
  }

  async uploadFile(
    content: string,
    filename: string
  ): Promise<{
    id: string;
    object: string;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
  }> {
    // For batch files, we send as multipart form data
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="purpose"`,
      '',
      'batch',
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: application/jsonl',
      '',
      content,
      `--${boundary}--`
    ].join('\r\n');

    let response = await this.axios.post('/files', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${this.token}`
      }
    });
    return response.data;
  }
}
