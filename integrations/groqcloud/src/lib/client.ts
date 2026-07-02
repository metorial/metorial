import { createAxios } from 'slates';
import { groqCloudApiError, groqCloudServiceError } from './errors';

let BASE_URL = 'https://api.groq.com/openai/v1';

let sanitizeMultipartHeader = (value: string) => value.replace(/[\r\n"]/g, '_');

let appendMultipartField = (
  parts: Buffer[],
  boundary: string,
  name: string,
  value: string | number | boolean
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${sanitizeMultipartHeader(name)}"\r\n\r\n${String(value)}\r\n`
    )
  );
};

let appendMultipartFile = (
  parts: Buffer[],
  boundary: string,
  name: string,
  filename: string,
  content: Buffer,
  mimeType: string
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${sanitizeMultipartHeader(name)}"; filename="${sanitizeMultipartHeader(filename)}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
  );
  parts.push(content);
  parts.push(Buffer.from('\r\n'));
};

let buildMultipartBody = (params: {
  fields: Record<string, string | number | boolean | undefined>;
  fileField: string;
  filename: string;
  fileContent: Buffer;
  mimeType?: string;
}) => {
  let boundary = `----SlatesGroqCloudBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
  let parts: Buffer[] = [];

  for (let [name, value] of Object.entries(params.fields)) {
    if (value !== undefined) {
      appendMultipartField(parts, boundary, name, value);
    }
  }

  appendMultipartFile(
    parts,
    boundary,
    params.fileField,
    params.filename,
    params.fileContent,
    params.mimeType ?? 'application/octet-stream'
  );
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

let responseDataToBuffer = (data: unknown, failureMessage: string) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'binary');
  }

  throw groqCloudServiceError(failureMessage);
};

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

export interface ResponseRequest {
  model: string;
  input: string | Record<string, unknown>[];
  instructions?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  text?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
  parallelToolCalls?: boolean;
  serviceTier?: string;
  truncation?: string;
  store?: boolean;
  metadata?: Record<string, string>;
  user?: string;
}

export interface ResponseObject {
  id: string;
  object: string;
  status: string;
  created_at: number;
  model?: string | null;
  output?: unknown[];
  output_text?: string;
  error?: unknown;
  incomplete_details?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
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

export interface FileInfo {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
}

export interface FilesListResponse {
  object: string;
  data: FileInfo[];
}

export interface FileDeleteResponse {
  id: string;
  object: string;
  deleted: boolean;
}

export class Client {
  private axios: any;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors?.response?.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(groqCloudApiError(error))
    );

    for (let method of ['get', 'post', 'delete'] as const) {
      let request = this.axios[method]?.bind(this.axios);
      if (!request) {
        continue;
      }

      this.axios[method] = async (...args: any[]) => {
        try {
          return await request(...args);
        } catch (error) {
          throw groqCloudApiError(error);
        }
      };
    }
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

  async createResponse(req: ResponseRequest): Promise<ResponseObject> {
    let body: Record<string, unknown> = {
      model: req.model,
      input: req.input
    };

    if (req.instructions !== undefined) body.instructions = req.instructions;
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.topP !== undefined) body.top_p = req.topP;
    if (req.maxOutputTokens !== undefined) body.max_output_tokens = req.maxOutputTokens;
    if (req.tools !== undefined) body.tools = req.tools;
    if (req.toolChoice !== undefined) body.tool_choice = req.toolChoice;
    if (req.text !== undefined) body.text = req.text;
    if (req.reasoning !== undefined) body.reasoning = req.reasoning;
    if (req.parallelToolCalls !== undefined) body.parallel_tool_calls = req.parallelToolCalls;
    if (req.serviceTier !== undefined) body.service_tier = req.serviceTier;
    if (req.truncation !== undefined) body.truncation = req.truncation;
    if (req.store !== undefined) body.store = req.store;
    if (req.metadata !== undefined) body.metadata = req.metadata;
    if (req.user !== undefined) body.user = req.user;

    let response = await this.axios.post('/responses', body);
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

  async createSpeech(req: SpeechRequest): Promise<{
    audioBase64: string;
    contentType?: string;
    sizeBytes: number;
  }> {
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

    let buffer = responseDataToBuffer(
      response.data,
      'Groq Cloud returned speech audio in an unsupported format.'
    );

    return {
      audioBase64: buffer.toString('base64'),
      contentType: response.headers?.['content-type'],
      sizeBytes: buffer.byteLength
    };
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

  async uploadFile(content: string, filename: string): Promise<FileInfo> {
    let multipart = buildMultipartBody({
      fields: { purpose: 'batch' },
      fileField: 'file',
      filename,
      fileContent: Buffer.from(content, 'utf8'),
      mimeType: 'application/jsonl'
    });

    let response = await this.axios.post('/files', multipart.body, {
      headers: {
        'Content-Type': multipart.contentType,
        Authorization: `Bearer ${this.token}`
      }
    });
    return response.data;
  }

  async listFiles(): Promise<FilesListResponse> {
    let response = await this.axios.get('/files');
    return response.data;
  }

  async getFile(fileId: string): Promise<FileInfo> {
    let response = await this.axios.get(`/files/${fileId}`);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<FileDeleteResponse> {
    let response = await this.axios.delete(`/files/${fileId}`);
    return response.data;
  }

  async downloadFile(fileId: string): Promise<{
    content: string;
    contentType?: string;
    sizeBytes: number;
  }> {
    let response = await this.axios.get(`/files/${fileId}/content`, {
      responseType: 'text'
    });
    let content =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    return {
      content,
      contentType: response.headers?.['content-type'],
      sizeBytes: Buffer.byteLength(content, 'utf8')
    };
  }
}
