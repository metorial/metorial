import { createAxios } from 'slates';

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

export interface ImageGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
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
    embedding: number[];
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
  audio?: { url: string };
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
  generation_id: string;
  status: string;
  result?: {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
        }>;
      }>;
    };
  };
  [key: string]: unknown;
}

export interface VideoGenerationRequest {
  model: string;
  prompt: string;
  firstFrameImage?: string;
}

export interface VideoGenerationResponse {
  generation_id: string;
}

export interface VideoResultResponse {
  id: string;
  status: string;
  video?: {
    url?: string;
  };
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(clientConfig: ClientConfig) {
    this.http = createAxios({
      baseURL: clientConfig.baseUrl,
      headers: {
        Authorization: `Bearer ${clientConfig.token}`,
        'Content-Type': 'application/json'
      }
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
    if (request.n !== undefined) body.n = request.n;
    if (request.size !== undefined) body.size = request.size;
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

  async textToSpeech(request: TtsRequest): Promise<TtsResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      text: request.text
    };

    if (request.voice !== undefined) body.voice = request.voice;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;
    if (request.speed !== undefined) body.speed = request.speed;

    let response = await this.http.post('/v1/tts', body);
    return response.data;
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
    let response = await this.http.get(`/v1/stt/${generationId}`);
    return response.data;
  }

  async moderateContent(
    model: string,
    messages: ChatMessage[]
  ): Promise<ChatCompletionResponse> {
    let body = {
      model,
      messages
    };

    let response = await this.http.post('/chat/completions', body);
    return response.data;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    let body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt
    };

    if (request.firstFrameImage !== undefined)
      body.first_frame_image = request.firstFrameImage;

    let response = await this.http.post('/v2/generate/video/minimax/generation', body);
    return response.data;
  }

  async getVideoResult(generationId: string): Promise<VideoResultResponse> {
    let response = await this.http.get('/v2/generate/video/minimax/generation', {
      params: { generation_id: generationId }
    });
    return response.data;
  }

  async listModels(): Promise<{
    data: Array<{ id: string; object: string; owned_by?: string }>;
  }> {
    let response = await this.http.get('/v1/models');
    return response.data;
  }
}
