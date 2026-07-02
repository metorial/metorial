import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  siteUrl?: string;
  appTitle?: string;
}

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

  // ---- Chat Completions ----

  async createChatCompletion(params: {
    model: string;
    messages: Array<{
      role: string;
      content: string | Record<string, unknown>[];
      name?: string;
      toolCallId?: string;
      toolCalls?: Record<string, unknown>[];
    }>;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    repetitionPenalty?: number;
    stop?: string | string[];
    seed?: number;
    tools?: Record<string, unknown>[];
    toolChoice?: string | Record<string, unknown>;
    responseFormat?: Record<string, unknown>;
    models?: string[];
    route?: string;
    provider?: Record<string, unknown>;
    transforms?: string[];
    plugins?: Record<string, unknown>[];
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages.map(m => {
        let msg: Record<string, unknown> = {
          role: m.role,
          content: m.content
        };
        if (m.name !== undefined) msg.name = m.name;
        if (m.toolCallId !== undefined) msg.tool_call_id = m.toolCallId;
        if (m.toolCalls !== undefined) msg.tool_calls = m.toolCalls;
        return msg;
      })
    };

    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.topK !== undefined) body.top_k = params.topK;
    if (params.frequencyPenalty !== undefined)
      body.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined) body.presence_penalty = params.presencePenalty;
    if (params.repetitionPenalty !== undefined)
      body.repetition_penalty = params.repetitionPenalty;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.toolChoice !== undefined) body.tool_choice = params.toolChoice;
    if (params.responseFormat !== undefined) body.response_format = params.responseFormat;
    if (params.models !== undefined) body.models = params.models;
    if (params.route !== undefined) body.route = params.route;
    if (params.provider !== undefined) body.provider = params.provider;
    if (params.transforms !== undefined) body.transforms = params.transforms;
    if (params.plugins !== undefined) body.plugins = params.plugins;

    let response = await this.axios.post('/chat/completions', body);
    return response.data;
  }

  // ---- Embeddings ----

  async createEmbedding(params: {
    model: string;
    input: string | string[];
  }): Promise<Record<string, unknown>> {
    let body = {
      model: params.model,
      input: params.input
    };

    let response = await this.axios.post('/embeddings', body);
    return response.data;
  }

  // ---- Models ----

  async listModels(params?: {
    supportedParameters?: string;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.supportedParameters) {
      queryParams.supported_parameters = params.supportedParameters;
    }

    let response = await this.axios.get('/models', { params: queryParams });
    return response.data?.data || [];
  }

  async getModel(modelId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/models/${modelId}`);
    return response.data?.data || response.data;
  }

  // ---- Generation Stats ----

  async getGenerationStats(generationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/generation?id=${encodeURIComponent(generationId)}`);
    return response.data?.data || response.data;
  }

  // ---- Credits ----

  async getCredits(): Promise<{ totalCredits: number; totalUsage: number }> {
    let response = await this.axios.get('/credits');
    let data = response.data?.data || response.data;
    return {
      totalCredits: data?.total_credits ?? 0,
      totalUsage: data?.total_usage ?? 0
    };
  }

  // ---- Auth/Key Info ----

  async getKeyInfo(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/auth/key');
    return response.data?.data || response.data;
  }

  // ---- API Key Management ----

  async createApiKey(params: {
    name: string;
    limit?: number;
    disabled?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name
    };
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.disabled !== undefined) body.disabled = params.disabled;

    let response = await this.axios.post('/keys', body);
    return response.data;
  }

  async listApiKeys(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/keys');
    return response.data?.data || response.data || [];
  }

  async deleteApiKey(keyHash: string): Promise<void> {
    await this.axios.delete(`/keys/${encodeURIComponent(keyHash)}`);
  }

  // ---- Guardrails ----

  async createGuardrail(params: {
    name: string;
    budgetLimit?: number;
    budgetResetInterval?: string;
    modelAllowlist?: string[];
    modelDenylist?: string[];
    providerAllowlist?: string[];
    providerDenylist?: string[];
    zdr?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name
    };
    if (params.budgetLimit !== undefined) body.budget_limit = params.budgetLimit;
    if (params.budgetResetInterval !== undefined)
      body.budget_reset_interval = params.budgetResetInterval;
    if (params.modelAllowlist !== undefined) body.model_allowlist = params.modelAllowlist;
    if (params.modelDenylist !== undefined) body.model_denylist = params.modelDenylist;
    if (params.providerAllowlist !== undefined)
      body.provider_allowlist = params.providerAllowlist;
    if (params.providerDenylist !== undefined)
      body.provider_denylist = params.providerDenylist;
    if (params.zdr !== undefined) body.zdr = params.zdr;

    let response = await this.axios.post('/guardrails', body);
    return response.data;
  }

  async listGuardrails(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/guardrails');
    return response.data?.data || response.data || [];
  }

  async getGuardrail(guardrailId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/guardrails/${encodeURIComponent(guardrailId)}`);
    return response.data?.data || response.data;
  }

  async updateGuardrail(
    guardrailId: string,
    params: {
      name?: string;
      budgetLimit?: number;
      budgetResetInterval?: string;
      modelAllowlist?: string[];
      modelDenylist?: string[];
      providerAllowlist?: string[];
      providerDenylist?: string[];
      zdr?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.budgetLimit !== undefined) body.budget_limit = params.budgetLimit;
    if (params.budgetResetInterval !== undefined)
      body.budget_reset_interval = params.budgetResetInterval;
    if (params.modelAllowlist !== undefined) body.model_allowlist = params.modelAllowlist;
    if (params.modelDenylist !== undefined) body.model_denylist = params.modelDenylist;
    if (params.providerAllowlist !== undefined)
      body.provider_allowlist = params.providerAllowlist;
    if (params.providerDenylist !== undefined)
      body.provider_denylist = params.providerDenylist;
    if (params.zdr !== undefined) body.zdr = params.zdr;

    let response = await this.axios.put(
      `/guardrails/${encodeURIComponent(guardrailId)}`,
      body
    );
    return response.data;
  }

  async deleteGuardrail(guardrailId: string): Promise<void> {
    await this.axios.delete(`/guardrails/${encodeURIComponent(guardrailId)}`);
  }
}
