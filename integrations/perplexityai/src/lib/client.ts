import { createAxios } from 'slates';
import { perplexityApiError } from './errors';

let BASE_URL = 'https://api.perplexity.ai';

type AxiosResponse<T> = {
  data: T;
};

export class PerplexityClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(
    operation: string,
    run: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw perplexityApiError(error, operation);
    }
  }

  async chatCompletion(params: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return this.request('chat completion', () => this.axios.post('/v1/sonar', params));
  }

  async createAsyncChatCompletion(
    params: ChatCompletionRequest
  ): Promise<AsyncChatCompletionResponse> {
    return this.request('create async chat completion', () =>
      this.axios.post('/v1/async/sonar', { request: params })
    );
  }

  async getAsyncChatCompletion(requestId: string): Promise<AsyncChatCompletionResponse> {
    return this.request('get async chat completion', () =>
      this.axios.get(`/v1/async/sonar/${encodeURIComponent(requestId)}`)
    );
  }

  async listAsyncChatCompletions(): Promise<ListAsyncChatCompletionsResponse> {
    return this.request('list async chat completions', () =>
      this.axios.get('/v1/async/sonar')
    );
  }

  async search(params: SearchRequest): Promise<SearchResponse> {
    return this.request('search', () => this.axios.post('/search', params));
  }

  async agentCompletion(params: AgentRequest): Promise<AgentResponse> {
    return this.request('agent completion', () => this.axios.post('/v1/agent', params));
  }

  async listAgentModels(): Promise<ListModelsResponse> {
    return this.request('list agent models', () => this.axios.get('/v1/models'));
  }

  async createEmbeddings(params: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    return this.request('create embeddings', () => this.axios.post('/v1/embeddings', params));
  }

  async createContextualizedEmbeddings(
    params: ContextualizedEmbeddingsRequest
  ): Promise<ContextualizedEmbeddingsResponse> {
    return this.request('create contextualized embeddings', () =>
      this.axios.post('/v1/contextualizedembeddings', params)
    );
  }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ResponseFormat =
  | {
      type: 'text';
    }
  | {
      type: 'json_schema';
      json_schema: Record<string, unknown>;
    };

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  stream?: boolean;
  search_recency_filter?: string;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: ResponseFormat;
  search_after_date_filter?: string;
  search_before_date_filter?: string;
  last_updated_after_filter?: string;
  last_updated_before_filter?: string;
  search_language_filter?: string[];
  reasoning_effort?: string;
  disable_search?: boolean;
  enable_search_classifier?: boolean;
  search_mode?: string;
  image_format_filter?: string[];
  image_domain_filter?: string[];
  web_search_options?: {
    search_context_size?: 'low' | 'medium' | 'high';
  };
};

export type ChatCompletionChoice = {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
};

export type ChatCompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type SearchResult = {
  title: string;
  url: string;
  date?: string | null;
  snippet?: string | null;
  source?: string | null;
  last_updated?: string | null;
};

export type ChatCompletionResponse = {
  id: string;
  model: string;
  created: number;
  object: string;
  choices: ChatCompletionChoice[];
  citations?: string[];
  search_results?: SearchResult[];
  images?: Array<{
    imageUrl: string;
    originUrl: string;
    height?: number;
    width?: number;
  }>;
  related_questions?: string[];
  usage: ChatCompletionUsage;
};

export type AsyncChatCompletionResponse = {
  id?: string;
  request_id?: string;
  api_request?: string;
  status?: string;
  created_at?: number;
  completed_at?: number;
  response?: ChatCompletionResponse;
  error?: unknown;
  [key: string]: unknown;
};

export type ListAsyncChatCompletionsResponse =
  | {
      data?: AsyncChatCompletionResponse[];
      requests?: AsyncChatCompletionResponse[];
      items?: AsyncChatCompletionResponse[];
      [key: string]: unknown;
    }
  | AsyncChatCompletionResponse[];

export type SearchRequest = {
  query: string | string[];
  country?: string;
  max_results?: number;
  max_tokens?: number;
  max_tokens_per_page?: number;
  search_context_size?: 'low' | 'medium' | 'high';
  search_type?: 'web' | 'people';
  search_language_filter?: string[];
  search_domain_filter?: string[];
  search_recency_filter?: string;
  search_after_date_filter?: string;
  search_before_date_filter?: string;
  last_updated_after_filter?: string;
  last_updated_before_filter?: string;
};

export type SearchResultItem = {
  title: string;
  url: string;
  snippet: string;
  date?: string | null;
  last_updated?: string | null;
  source?: string | null;
};

export type SearchResponse = {
  results: SearchResultItem[];
  id: string;
  server_time?: string | null;
};

export type AgentTool = {
  type: 'web_search' | 'fetch_url' | 'finance_search' | 'people_search' | 'sandbox';
  search_context_size?: 'low' | 'medium' | 'high';
  max_tokens?: number;
  max_tokens_per_page?: number;
  filters?: Record<string, unknown>;
  user_location?: Record<string, unknown>;
};

export type AgentRequest = {
  model?: string;
  models?: string[];
  preset?: string;
  input: string;
  instructions?: string;
  tools?: AgentTool[];
  max_output_tokens?: number;
  max_steps?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: ResponseFormat;
  reasoning?: {
    effort?: string;
    budget_tokens?: number;
  };
};

export type AgentOutputItem = {
  type: string;
  id?: string;
  role?: string;
  status?: string;
  content?: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  results?: SearchResult[];
  contents?: Array<{ url?: string; content?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type AgentResponse = {
  id: string;
  model?: string;
  object?: string;
  status?: string;
  error?: {
    message?: string;
    code?: string;
    [key: string]: unknown;
  } | null;
  output: AgentOutputItem[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost?: Record<string, unknown>;
  };
};

export type ModelObject = {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
};

export type ListModelsResponse = {
  object?: string;
  data: ModelObject[];
};

export type EmbeddingsRequest = {
  model: string;
  input: string[];
  dimensions?: number;
  encoding_format?: 'base64_int8' | 'base64_binary';
};

export type ContextualizedEmbeddingsRequest = {
  model: string;
  input: string[][];
  dimensions?: number;
  encoding_format?: 'base64_int8' | 'base64_binary';
};

export type EmbeddingItem = {
  object: string;
  index: number;
  embedding: string;
};

export type EmbeddingsResponse = {
  object: string;
  data: EmbeddingItem[];
  model?: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
    cost?: Record<string, unknown>;
  };
};

export type ContextualizedEmbeddingDocument = {
  object: string;
  index: number;
  data: EmbeddingItem[];
};

export type ContextualizedEmbeddingsResponse = {
  object: string;
  data: ContextualizedEmbeddingDocument[];
  model?: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
    cost?: Record<string, unknown>;
  };
};
