import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue
} from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export interface ChatMessage {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  seed?: number;
  responseFormat?: { type: string };
  webSearch?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  negativePrompt?: string;
  n?: number;
  size?: string;
  aspectRatio?: string;
  seed?: number;
  responseFormat?: string;
  guidanceScale?: number;
  enhancePrompt?: boolean;
}

interface GeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  content_type?: string;
}

export interface ImageGenerationResponse {
  data?: GeneratedImage[] | null;
  images?: GeneratedImage[];
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encodingFormat?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  data: Array<{
    object: string;
    embedding: number[] | string;
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface TtsRequest {
  model: string;
  text: string;
  voice?: string;
  responseFormat?: string;
  speed?: number;
}

export interface TtsResponse {
  audio?: { url: string } | string;
  metadata?: {
    transaction_key?: string;
    request_id?: string;
    created?: string;
    duration?: number;
    channels?: number;
    model_info?: {
      name?: string;
      version?: string;
    };
  };
  [key: string]: unknown;
}

export interface SttCreateRequest {
  model: string;
  url?: string;
}

export interface SttCreateResponse {
  generation_id: string;
}

export interface SttResultResponse {
  generation_id?: string;
  id?: string;
  status: string;
  result?: TranscriptionOutput;
  output?: TranscriptionOutput | null;
  error?: { name?: string; message?: string } | null;
  [key: string]: unknown;
}

interface TranscriptionChannel {
  alternatives?: Array<{ transcript?: string }>;
}

interface TranscriptionOutput {
  text?: string;
  results?: { channels?: TranscriptionChannel[] | TranscriptionChannel };
}

export let getTranscript = (result: SttResultResponse) => {
  let extract = (output?: TranscriptionOutput | null) => {
    let channels = output?.results?.channels;
    let channel = Array.isArray(channels) ? channels[0] : channels;
    return channel?.alternatives?.[0]?.transcript ?? output?.text;
  };
  return extract(result.result) ?? extract(result.output);
};

export let isTranscriptionPending = (status: string) =>
  ['waiting', 'active', 'queued', 'generating', 'processing', 'pending'].includes(status);

export let assertGenerationSucceeded = (
  result: { status: string; error?: { message?: string } | null },
  kind: string
) => {
  if (result.status === 'failed' || result.status === 'error') {
    throw createApiServiceError(
      `${kind} generation failed${result.error?.message ? `: ${result.error.message}` : '.'}`
    );
  }
};

export interface VideoGenerationRequest {
  model: string;
  prompt: string;
  firstFrameImage?: string;
}

export interface VideoGenerationResponse {
  generation_id?: string;
  id?: string;
  status?: string;
}

export interface VideoResultResponse {
  id: string;
  status: string;
  video?: {
    url?: string;
  } | null;
  error?: { name?: string; message?: string } | null;
}

export interface ModelListItem {
  id: string;
  object?: string;
  owned_by?: string;
  type?: string;
  aliases?: string[];
  tags?: string[];
  capabilities?: string[];
  pricing?: Record<string, unknown>;
  modalities?: { input?: string[]; output?: string[] };
  info?: {
    name?: string;
    developer?: string;
    description?: string;
    docsUrl?: string;
  };
}

export interface ModelFilters {
  id?: string;
  type?: string;
  tags?: string;
  modalities?: string;
  capabilities?: string;
  include?: string;
}

export interface AccountDetails {
  user_id: number;
  email: string;
  current_balance: number;
  currency: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(clientConfig: ClientConfig) {
    this.http = createAuthenticatedAxios({
      baseURL: clientConfig.baseUrl,
      authHeader: { value: `Bearer ${clientConfig.token}` },
      timeout: 120000,
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'AI/ML API', reason: 'aiml_api_error' })
    });
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.frequencyPenalty !== undefined)
      body.frequency_penalty = request.frequencyPenalty;
    if (request.presencePenalty !== undefined) body.presence_penalty = request.presencePenalty;
    if (request.stop !== undefined) body.stop = request.stop;
    if (request.stream !== undefined) body.stream = request.stream;
    if (request.seed !== undefined) body.seed = request.seed;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;
    if (request.webSearch !== undefined) body.web_search = request.webSearch;

    let response = await this.http.post('/v1/chat/completions', body);
    return response.data;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt
    };

    if (request.negativePrompt !== undefined) body.negative_prompt = request.negativePrompt;
    let fluxSizing = ['flux/schnell', 'flux/dev', 'flux-pro', 'flux-pro/v1.1'].includes(
      request.model
    );
    if (request.n !== undefined) body[fluxSizing ? 'num_images' : 'n'] = request.n;
    if (request.size !== undefined) {
      let dimensions = /^(\d+)x(\d+)$/.exec(request.size);
      body[fluxSizing ? 'image_size' : 'size'] =
        fluxSizing && dimensions
          ? { width: Number(dimensions[1]), height: Number(dimensions[2]) }
          : request.size;
    }
    if (request.aspectRatio !== undefined) body.aspect_ratio = request.aspectRatio;
    if (request.seed !== undefined) body.seed = request.seed;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;
    if (request.guidanceScale !== undefined) body.guidance_scale = request.guidanceScale;
    if (request.enhancePrompt !== undefined) body.enhance_prompt = request.enhancePrompt;

    let response = await this.http.post('/v1/images/generations', body);
    return response.data;
  }

  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      input: request.input
    };

    if (request.encodingFormat !== undefined) body.encoding_format = request.encodingFormat;
    if (request.dimensions !== undefined) body.dimensions = request.dimensions;

    let response = await this.http.post('/v1/embeddings', body);
    return response.data;
  }

  async textToSpeech(request: TtsRequest): Promise<{
    result: TtsResponse;
    content?: Uint8Array;
    mimeType?: string;
  }> {
    let body: Record<string, unknown> = {
      model: request.model,
      text: request.text,
      stream: false
    };

    if (request.voice !== undefined) body.voice = request.voice;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;
    if (request.speed !== undefined) body.speed = request.speed;

    let response = await this.http.post<ArrayBuffer>('/v1/tts', body, {
      headers: { Accept: 'application/json' },
      responseType: 'arraybuffer'
    });
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')?.split(';')[0];
    let content = new Uint8Array(response.data);
    if (mimeType?.startsWith('audio/')) {
      return { result: {}, content, mimeType };
    }
    try {
      let result: unknown = JSON.parse(new TextDecoder().decode(content));
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw createApiServiceError('AI/ML API returned an invalid speech response.');
      }
      return { result: result as TtsResponse };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'AI/ML API',
        operation: 'read speech response',
        reason: 'invalid_speech_response',
        fallbackMessage: 'Expected generated audio or a JSON audio URL.'
      });
    }
  }

  async createSpeechToText(request: SttCreateRequest): Promise<SttCreateResponse> {
    let body: Record<string, unknown> = {
      model: request.model
    };

    if (request.url !== undefined) body.url = request.url;

    let response = await this.http.post('/v1/stt/create', body);
    return response.data;
  }

  async getSpeechToTextResult(generationId: string): Promise<SttResultResponse> {
    let response = await this.http.get(`/v1/stt/${encodeURIComponent(generationId)}`);
    return response.data;
  }

  async moderateContent(
    model: string,
    messages: ChatMessage[]
  ): Promise<ChatCompletionResponse> {
    let body = {
      model: model === 'Meta-Llama-Guard-3-8B' ? 'meta-llama/Meta-Llama-Guard-3-8B' : model,
      messages
    };

    let response = await this.http.post('/v1/chat/completions', body);
    return response.data;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt
    };

    if (request.firstFrameImage !== undefined) body.image_url = request.firstFrameImage;

    let response = await this.http.post('/v2/video/generations', body);
    return response.data;
  }

  async getVideoResult(generationId: string): Promise<VideoResultResponse> {
    let response = await this.http.get('/v2/video/generations', {
      params: { generation_id: generationId }
    });
    return response.data;
  }

  async listModels(filters: ModelFilters = {}): Promise<{
    data: ModelListItem[];
  }> {
    let response = await this.http.get('/v1/models', { params: filters });
    return response.data;
  }

  async getCurrentUser(): Promise<AccountDetails> {
    let response = await this.http.get('/v2/billing/detail');
    return response.data;
  }
}
