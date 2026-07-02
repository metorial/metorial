// Chat Completion types

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      reasoning_content?: string;
      tool_calls?: ToolCall[];
    }
  | { role: 'tool'; content: string; tool_call_id: string };

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ResponseFormat = {
  type: 'text' | 'json_object';
};

export type ThinkingConfig = {
  type: 'enabled' | 'disabled';
  budget_tokens?: number;
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  response_format?: ResponseFormat;
  tools?: ToolDefinition[];
  tool_choice?: string | { type: 'function'; function: { name: string } };
  thinking?: ThinkingConfig;
  logprobs?: boolean;
  top_logprobs?: number;
};

export type ChatCompletionChoice = {
  index: number;
  message: {
    role: string;
    content: string | null;
    reasoning_content?: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
  logprobs?: Record<string, unknown> | null;
};

export type UsageInfo = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
};

export type ChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint?: string;
  choices: ChatCompletionChoice[];
  usage: UsageInfo;
};

// FIM Completion types

export type FimCompletionRequest = {
  model: string;
  prompt: string;
  suffix?: string;
  echo?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  logprobs?: number;
  stream?: boolean;
};

export type FimCompletionChoice = {
  text: string;
  index: number;
  finish_reason: string;
  logprobs?: Record<string, unknown> | null;
};

export type FimCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint?: string;
  choices: FimCompletionChoice[];
  usage: UsageInfo;
};

// Model types

export type ModelInfo = {
  id: string;
  object: string;
  owned_by: string;
};

export type ListModelsResponse = {
  object: string;
  data: ModelInfo[];
};

// Balance types

export type BalanceInfo = {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
};

export type GetBalanceResponse = {
  is_available: boolean;
  balance_infos: BalanceInfo[];
};
