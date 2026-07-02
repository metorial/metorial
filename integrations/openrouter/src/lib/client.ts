import { createAxios } from 'slates';
import { openRouterApiError, openRouterServiceError } from './errors';

export interface ClientConfig {
  token: string;
  siteUrl?: string;
  appTitle?: string;
}

type JsonRecord = Record<string, unknown>;

let isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let dataOrBody = (response: { data?: unknown }) => {
  if (isRecord(response.data) && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
};

let compact = (body: JsonRecord) => {
  let result: JsonRecord = {};
  for (let [key, value] of Object.entries(body)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
};

let modelPath = (modelId: string) => {
  let separatorIndex = modelId.indexOf('/');
  if (separatorIndex <= 0 || separatorIndex === modelId.length - 1) {
    throw openRouterServiceError(
      'OpenRouter model IDs must include an author and slug, for example "openai/gpt-4o-mini".'
    );
  }

  let author = modelId.slice(0, separatorIndex);
  let slug = modelId.slice(separatorIndex + 1);
  return `${encodeURIComponent(author)}/${encodeURIComponent(slug)}`;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };

    if (config.siteUrl) {
      headers['HTTP-Referer'] = config.siteUrl;
    }
    if (config.appTitle) {
      headers['X-OpenRouter-Title'] = config.appTitle;
    }

    this.axios = createAxios({
      baseURL: 'https://openrouter.ai/api/v1',
      headers
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw openRouterApiError(error, operation);
    }
  }

  async createChatCompletion(params: {
    model: string;
    messages: Array<{
      role: string;
      content: string | JsonRecord[];
      name?: string;
      toolCallId?: string;
      toolCalls?: JsonRecord[];
    }>;
    temperature?: number;
    maxTokens?: number;
    maxCompletionTokens?: number;
    topP?: number;
    topK?: number;
    topA?: number;
    minP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    repetitionPenalty?: number;
    stop?: string | string[];
    seed?: number;
    tools?: JsonRecord[];
    toolChoice?: string | JsonRecord;
    parallelToolCalls?: boolean;
    responseFormat?: JsonRecord;
    models?: string[];
    route?: string;
    provider?: JsonRecord;
    transforms?: string[];
    plugins?: JsonRecord[];
    reasoning?: JsonRecord;
    reasoningEffort?: string;
    modalities?: string[];
    metadata?: Record<string, string>;
    serviceTier?: string;
    sessionId?: string;
    trace?: JsonRecord;
    user?: string;
    logprobs?: boolean;
    topLogprobs?: number;
  }): Promise<JsonRecord> {
    return await this.request('create chat completion', async () => {
      let body = compact({
        model: params.model,
        messages: params.messages.map(m =>
          compact({
            role: m.role,
            content: m.content,
            name: m.name,
            tool_call_id: m.toolCallId,
            tool_calls: m.toolCalls
          })
        ),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        max_completion_tokens: params.maxCompletionTokens,
        top_p: params.topP,
        top_k: params.topK,
        top_a: params.topA,
        min_p: params.minP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
        repetition_penalty: params.repetitionPenalty,
        stop: params.stop,
        seed: params.seed,
        tools: params.tools,
        tool_choice: params.toolChoice,
        parallel_tool_calls: params.parallelToolCalls,
        response_format: params.responseFormat,
        models: params.models,
        route: params.route,
        provider: params.provider,
        transforms: params.transforms,
        plugins: params.plugins,
        reasoning:
          params.reasoning ??
          (params.reasoningEffort ? { effort: params.reasoningEffort } : undefined),
        modalities: params.modalities,
        metadata: params.metadata,
        service_tier: params.serviceTier,
        session_id: params.sessionId,
        trace: params.trace,
        user: params.user,
        logprobs: params.logprobs,
        top_logprobs: params.topLogprobs
      });

      let response = await this.axios.post('/chat/completions', body);
      return (response.data ?? {}) as JsonRecord;
    });
  }

  async createResponse(params: {
    model?: string;
    input: string | JsonRecord[];
    instructions?: string;
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    tools?: JsonRecord[];
    toolChoice?: string | JsonRecord;
    parallelToolCalls?: boolean;
    provider?: JsonRecord;
    plugins?: JsonRecord[];
    reasoning?: JsonRecord;
    modalities?: string[];
    metadata?: Record<string, string>;
    previousResponseId?: string;
    sessionId?: string;
    serviceTier?: string;
    stream?: boolean;
    text?: JsonRecord;
    trace?: JsonRecord;
    user?: string;
  }): Promise<JsonRecord> {
    return await this.request('create response', async () => {
      let response = await this.axios.post(
        '/responses',
        compact({
          model: params.model,
          input: params.input,
          instructions: params.instructions,
          max_output_tokens: params.maxOutputTokens,
          temperature: params.temperature,
          top_p: params.topP,
          top_k: params.topK,
          tools: params.tools,
          tool_choice: params.toolChoice,
          parallel_tool_calls: params.parallelToolCalls,
          provider: params.provider,
          plugins: params.plugins,
          reasoning: params.reasoning,
          modalities: params.modalities,
          metadata: params.metadata,
          previous_response_id: params.previousResponseId,
          session_id: params.sessionId,
          service_tier: params.serviceTier,
          stream: params.stream,
          text: params.text,
          trace: params.trace,
          user: params.user
        })
      );
      return (response.data ?? {}) as JsonRecord;
    });
  }

  async createEmbedding(params: {
    model: string;
    input: string | string[];
    dimensions?: number;
    inputType?: string;
    provider?: JsonRecord;
    user?: string;
  }): Promise<JsonRecord> {
    return await this.request('create embedding', async () => {
      let response = await this.axios.post(
        '/embeddings',
        compact({
          model: params.model,
          input: params.input,
          dimensions: params.dimensions,
          input_type: params.inputType,
          provider: params.provider,
          user: params.user
        })
      );
      return (response.data ?? {}) as JsonRecord;
    });
  }

  async listModels(params?: {
    category?: string;
    supportedParameters?: string;
    outputModalities?: string;
    sort?: string;
    userFiltered?: boolean;
  }): Promise<JsonRecord[]> {
    return await this.request('list models', async () => {
      let response = await this.axios.get(params?.userFiltered ? '/models/user' : '/models', {
        params: compact({
          category: params?.category,
          supported_parameters: params?.supportedParameters,
          output_modalities: params?.outputModalities,
          sort: params?.sort
        })
      });
      let data = dataOrBody(response);
      return Array.isArray(data) ? (data as JsonRecord[]) : [];
    });
  }

  async listEmbeddingModels(): Promise<JsonRecord[]> {
    return await this.request('list embedding models', async () => {
      let response = await this.axios.get('/embeddings/models');
      let data = dataOrBody(response);
      return Array.isArray(data) ? (data as JsonRecord[]) : [];
    });
  }

  async getModel(modelId: string): Promise<JsonRecord> {
    return await this.request('get model', async () => {
      let response = await this.axios.get(`/model/${modelPath(modelId)}`);
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async listModelEndpoints(modelId: string): Promise<JsonRecord> {
    return await this.request('list model endpoints', async () => {
      let response = await this.axios.get(`/models/${modelPath(modelId)}/endpoints`);
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async listProviders(): Promise<JsonRecord[]> {
    return await this.request('list providers', async () => {
      let response = await this.axios.get('/providers');
      let data = dataOrBody(response);
      return Array.isArray(data) ? (data as JsonRecord[]) : [];
    });
  }

  async getGenerationStats(generationId: string): Promise<JsonRecord> {
    return await this.request('get generation stats', async () => {
      let response = await this.axios.get('/generation', {
        params: { id: generationId }
      });
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async getCredits(): Promise<{ totalCredits: number; totalUsage: number }> {
    return await this.request('get credits', async () => {
      let response = await this.axios.get('/credits');
      let data = dataOrBody(response) as JsonRecord | undefined;
      return {
        totalCredits: typeof data?.total_credits === 'number' ? data.total_credits : 0,
        totalUsage: typeof data?.total_usage === 'number' ? data.total_usage : 0
      };
    });
  }

  async getKeyInfo(): Promise<JsonRecord> {
    return await this.request('get current API key', async () => {
      let response = await this.axios.get('/key');
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async createApiKey(params: {
    name: string;
    limit?: number | null;
    limitReset?: 'daily' | 'weekly' | 'monthly' | null;
    includeByokInLimit?: boolean;
    expiresAt?: string | null;
    workspaceId?: string;
    creatorUserId?: string | null;
  }): Promise<JsonRecord> {
    return await this.request('create API key', async () => {
      let response = await this.axios.post(
        '/keys',
        compact({
          name: params.name,
          limit: params.limit,
          limit_reset: params.limitReset,
          include_byok_in_limit: params.includeByokInLimit,
          expires_at: params.expiresAt,
          workspace_id: params.workspaceId,
          creator_user_id: params.creatorUserId
        })
      );
      return (response.data ?? {}) as JsonRecord;
    });
  }

  async listApiKeys(params?: {
    includeDisabled?: boolean;
    offset?: number;
    workspaceId?: string;
  }): Promise<JsonRecord[]> {
    return await this.request('list API keys', async () => {
      let response = await this.axios.get('/keys', {
        params: compact({
          include_disabled:
            params?.includeDisabled === undefined ? undefined : String(params.includeDisabled),
          offset: params?.offset,
          workspace_id: params?.workspaceId
        })
      });
      let data = dataOrBody(response);
      return Array.isArray(data) ? (data as JsonRecord[]) : [];
    });
  }

  async getApiKey(keyHash: string): Promise<JsonRecord> {
    return await this.request('get API key', async () => {
      let response = await this.axios.get(`/keys/${encodeURIComponent(keyHash)}`);
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async updateApiKey(
    keyHash: string,
    params: {
      name?: string;
      limit?: number | null;
      limitReset?: 'daily' | 'weekly' | 'monthly' | null;
      disabled?: boolean;
      includeByokInLimit?: boolean;
    }
  ): Promise<JsonRecord> {
    return await this.request('update API key', async () => {
      let response = await this.axios.patch(
        `/keys/${encodeURIComponent(keyHash)}`,
        compact({
          name: params.name,
          limit: params.limit,
          limit_reset: params.limitReset,
          disabled: params.disabled,
          include_byok_in_limit: params.includeByokInLimit
        })
      );
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async deleteApiKey(keyHash: string): Promise<boolean> {
    return await this.request('delete API key', async () => {
      let response = await this.axios.delete(`/keys/${encodeURIComponent(keyHash)}`, {
        data: {}
      });
      let data = response.data as JsonRecord | undefined;
      return data?.deleted === true;
    });
  }

  async createGuardrail(params: {
    name: string;
    description?: string | null;
    limitUsd?: number | null;
    resetInterval?: 'daily' | 'weekly' | 'monthly';
    allowedModels?: string[] | null;
    ignoredModels?: string[] | null;
    allowedProviders?: string[] | null;
    ignoredProviders?: string[] | null;
    enforceZdr?: boolean | null;
    enforceZdrAnthropic?: boolean | null;
    enforceZdrGoogle?: boolean | null;
    enforceZdrOpenAI?: boolean | null;
    enforceZdrOther?: boolean | null;
    contentFilters?: JsonRecord[] | null;
    contentFilterBuiltins?: JsonRecord[] | null;
    workspaceId?: string;
  }): Promise<JsonRecord> {
    return await this.request('create guardrail', async () => {
      let response = await this.axios.post(
        '/guardrails',
        compact({
          name: params.name,
          description: params.description,
          limit_usd: params.limitUsd,
          reset_interval: params.resetInterval,
          allowed_models: params.allowedModels,
          ignored_models: params.ignoredModels,
          allowed_providers: params.allowedProviders,
          ignored_providers: params.ignoredProviders,
          enforce_zdr: params.enforceZdr,
          enforce_zdr_anthropic: params.enforceZdrAnthropic,
          enforce_zdr_google: params.enforceZdrGoogle,
          enforce_zdr_openai: params.enforceZdrOpenAI,
          enforce_zdr_other: params.enforceZdrOther,
          content_filters: params.contentFilters,
          content_filter_builtins: params.contentFilterBuiltins,
          workspace_id: params.workspaceId
        })
      );
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async listGuardrails(params?: {
    limit?: number;
    offset?: number;
    workspaceId?: string;
  }): Promise<{ guardrails: JsonRecord[]; totalCount?: number }> {
    return await this.request('list guardrails', async () => {
      let response = await this.axios.get('/guardrails', {
        params: compact({
          limit: params?.limit,
          offset: params?.offset,
          workspace_id: params?.workspaceId
        })
      });
      let body = response.data as JsonRecord | undefined;
      return {
        guardrails: Array.isArray(body?.data) ? (body.data as JsonRecord[]) : [],
        totalCount: typeof body?.total_count === 'number' ? body.total_count : undefined
      };
    });
  }

  async getGuardrail(guardrailId: string): Promise<JsonRecord> {
    return await this.request('get guardrail', async () => {
      let response = await this.axios.get(`/guardrails/${encodeURIComponent(guardrailId)}`);
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async updateGuardrail(
    guardrailId: string,
    params: {
      name?: string;
      description?: string | null;
      limitUsd?: number | null;
      resetInterval?: 'daily' | 'weekly' | 'monthly';
      allowedModels?: string[] | null;
      ignoredModels?: string[] | null;
      allowedProviders?: string[] | null;
      ignoredProviders?: string[] | null;
      enforceZdr?: boolean | null;
      enforceZdrAnthropic?: boolean | null;
      enforceZdrGoogle?: boolean | null;
      enforceZdrOpenAI?: boolean | null;
      enforceZdrOther?: boolean | null;
      contentFilters?: JsonRecord[] | null;
      contentFilterBuiltins?: JsonRecord[] | null;
    }
  ): Promise<JsonRecord> {
    return await this.request('update guardrail', async () => {
      let response = await this.axios.patch(
        `/guardrails/${encodeURIComponent(guardrailId)}`,
        compact({
          name: params.name,
          description: params.description,
          limit_usd: params.limitUsd,
          reset_interval: params.resetInterval,
          allowed_models: params.allowedModels,
          ignored_models: params.ignoredModels,
          allowed_providers: params.allowedProviders,
          ignored_providers: params.ignoredProviders,
          enforce_zdr: params.enforceZdr,
          enforce_zdr_anthropic: params.enforceZdrAnthropic,
          enforce_zdr_google: params.enforceZdrGoogle,
          enforce_zdr_openai: params.enforceZdrOpenAI,
          enforce_zdr_other: params.enforceZdrOther,
          content_filters: params.contentFilters,
          content_filter_builtins: params.contentFilterBuiltins
        })
      );
      return (dataOrBody(response) ?? {}) as JsonRecord;
    });
  }

  async deleteGuardrail(guardrailId: string): Promise<void> {
    await this.request('delete guardrail', async () => {
      await this.axios.delete(`/guardrails/${encodeURIComponent(guardrailId)}`);
    });
  }
}
