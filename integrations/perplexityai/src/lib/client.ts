import { createAxios } from 'slates';

let BASE_URL = 'https://api.perplexity.ai';

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

  // ─── Sonar Chat Completions API ──────────────────────────────────────

  async chatCompletion(params: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let response = await this.axios.post('/v1/sonar', params);
    return response.data;
  }

  // ─── Search API ──────────────────────────────────────────────────────

  async search(params: SearchRequest): Promise<SearchResponse> {
    let response = await this.axios.post('/search', params);
    return response.data;
  }

  // ─── Agent API ───────────────────────────────────────────────────────

  async agentCompletion(params: AgentRequest): Promise<AgentResponse> {
    let response = await this.axios.post('/v1/agent', params);
    return response.data;
  }

  // ─── Embeddings API ──────────────────────────────────────────────────

  async createEmbeddings(params: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    let response = await this.axios.post('/v1/embeddings', params);
    return response.data;
  }

  async createContextualizedEmbeddings(
    params: ContextualizedEmbeddingsRequest
  ): Promise<EmbeddingsResponse> {
    let response = await this.axios.post('/v1/contextualizedembeddings', params);
    return response.data;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: Record<string, unknown>;
  };
  search_after_date_filter?: string;
  search_before_date_filter?: string;
  search_language_filter?: string[];
  reasoning_effort?: string;
  disable_search?: boolean;
  search_mode?: string;
  search_context_size?: string;
  web_search_options?: Record<string, unknown>;
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
  date?: string;
  snippet?: string;
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

// ─── Search Types ──────────────────────────────────────────────────────

export type SearchRequest = {
  query: string | string[];
  country?: string;
  max_results?: number;
  max_tokens?: number;
  max_tokens_per_page?: number;
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
};

export type SearchResponse = {
  results: SearchResultItem[];
  id: string;
  server_time?: string | null;
};

// ─── Agent Types ───────────────────────────────────────────────────────

export type AgentTool = {
  type: 'web_search' | 'fetch_url' | 'function';
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type AgentRequest = {
  model?: string;
  models?: string[];
  preset?: string;
  input: string;
  instructions?: string;
  tools?: AgentTool[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: Record<string, unknown>;
  };
  reasoning?: {
    effort?: string;
    budget_tokens?: number;
  };
};

export type AgentOutputItem = {
  type: string;
  id?: string;
  content?: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type AgentResponse = {
  id: string;
  model?: string;
  object?: string;
  output: AgentOutputItem[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  search_results?: SearchResult[];
};

// ─── Embeddings Types ──────────────────────────────────────────────────

export type EmbeddingsRequest = {
  model: string;
  input: string[];
  dimensions?: number;
};

export type ContextualizedEmbeddingsRequest = {
  model: string;
  input: string[];
  dimensions?: number;
};

export type EmbeddingItem = {
  object: string;
  index: number;
  embedding: string | number[];
};

export type EmbeddingsResponse = {
  object: string;
  data: EmbeddingItem[];
  model?: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
};
