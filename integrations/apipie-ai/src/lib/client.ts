import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface ClientConfig {
  token: string;
  defaultProvider?: string;
  routing?: string;
}

export interface ChatCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string | Record<string, unknown>[] }>;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  n?: number;
  routing?: string;
  ragTune?: string;
  integrity?: number;
  memory?: number;
  memSession?: string;
  memExpire?: number;
  memClear?: boolean;
  online?: boolean;
  searches?: number;
  pull?: number;
  use?: number;
  scrapeLength?: number;
  searchLang?: string;
  searchGeo?: string;
  webSearchContextSize?: string;
  tools?: Record<string, unknown>[];
  toolChoice?: string | Record<string, unknown>;
  toolsModel?: string;
  responseFormat?: Record<string, unknown>;
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  provider?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number | string;
    latency_ms?: number;
  };
}

export interface ImageGenerationParams {
  model: string;
  prompt: string;
  provider?: string;
  n?: number;
  size?: string;
  quality?: string;
  style?: string;
  responseFormat?: string;
  image?: string;
}

export interface TextToSpeechParams {
  model: string;
  voice: string;
  input: string;
  provider?: string;
  responseFormat?: string;
  speed?: number;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

export interface EmbeddingsParams {
  model: string;
  input: string | string[];
  encodingFormat?: string;
  dimensions?: number;
}

export interface ModelsParams {
  type?: string;
  subtype?: string;
  provider?: string;
  model?: string;
  enabled?: number;
  voices?: boolean;
}

export interface SearchParams {
  query: string;
  searchProvider?: string;
  geo?: string;
  lang?: string;
  results?: number;
  safeSearch?: number;
}

export interface ScrapeParams {
  url: string;
  format?: string;
}

export interface UsageParams {
  limit?: number;
  offset?: number;
}

export interface RagUploadParams {
  collection: string;
  url: string;
  metatag?: string;
}

export interface RagDeleteParams {
  collection: string;
  deleteAll?: boolean;
  ids?: string[];
}

export interface StateResponse {
  scope: string;
  key: string;
  settings: Record<string, unknown>;
  enable_inline_cli?: boolean;
  enable_user_states?: boolean;
  gui_only?: boolean;
}

export interface StateUpdateParams {
  settings?: Record<string, unknown>;
  deleteKeys?: string[];
  enableInlineCli?: boolean;
  enableUserStates?: boolean;
  guiOnly?: boolean;
}

export let parseCost = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  let cost =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(cost)) {
    throw createApiServiceError('APIpie AI returned an invalid usage cost.');
  }
  return cost;
};

let validateCount = (value: number | undefined, name: string, minimum = 1) => {
  if (value !== undefined && (!Number.isInteger(value) || value < minimum)) {
    throw createApiServiceError(`"${name}" must be a whole number of at least ${minimum}.`);
  }
};

export class Client {
  private defaultProvider?: string;
  private routing?: string;
  private api;
  private ragApi;

  constructor(config: ClientConfig) {
    this.defaultProvider = config.defaultProvider;
    this.routing = config.routing;
    let options = {
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 180_000,
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, { providerLabel: 'APIpie AI', reason: 'apipie_api_error' })
    };
    this.api = createAuthenticatedAxios({ ...options, baseURL: 'https://apipie.ai/v1' });
    this.ragApi = createAuthenticatedAxios({ ...options, baseURL: 'https://apipie.ai' });
  }

  async chatCompletion(params: ChatCompletionParams) {
    for (let [name, value] of Object.entries({
      maxTokens: params.maxTokens,
      n: params.n
    })) {
      validateCount(value, name);
    }
    for (let [name, value] of Object.entries({
      searches: params.searches,
      pull: params.pull,
      use: params.use,
      scrapeLength: params.scrapeLength
    })) {
      validateCount(value, name, 0);
    }
    validateCount(params.topK, 'topK', 0);
    validateCount(params.memExpire, 'memExpire');
    if (params.memExpire !== undefined && params.memExpire > 1440) {
      throw createApiServiceError('"memExpire" cannot exceed 1440 minutes.');
    }
    if (params.messages.length === 0) {
      throw createApiServiceError('Provide at least one conversation message.');
    }
    let toolChoice = params.toolChoice;
    if (typeof toolChoice === 'string' && !['auto', 'none', 'required'].includes(toolChoice)) {
      toolChoice = { type: 'function', function: { name: toolChoice } };
    }
    let response = await this.api.post<ChatCompletionResponse>(
      '/chat/completions',
      pickDefined({
        model: params.model,
        messages: params.messages,
        provider: params.provider ?? this.defaultProvider,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        top_p: params.topP,
        top_k: params.topK,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
        n: params.n,
        routing: params.routing ?? this.routing,
        rag_tune: params.ragTune,
        integrity: params.integrity,
        memory: params.memory,
        mem_session: params.memSession,
        mem_expire: params.memExpire,
        mem_clear: params.memClear === undefined ? undefined : params.memClear ? 1 : 0,
        online: params.online,
        searches: params.searches,
        pull: params.pull,
        use: params.use,
        scrape_length: params.scrapeLength,
        search_lang: params.searchLang,
        search_geo: params.searchGeo,
        web_search_options: params.webSearchContextSize
          ? { search_context_size: params.webSearchContextSize }
          : undefined,
        tools: params.tools,
        tool_choice: toolChoice,
        tools_model: params.toolsModel,
        response_format: params.responseFormat,
        user: params.user
      })
    );
    if (!response.data?.id || !response.data.model || !Array.isArray(response.data.choices)) {
      throw createApiServiceError('APIpie AI returned an invalid chat completion response.');
    }
    return response.data;
  }

  async generateImage(params: ImageGenerationParams) {
    validateCount(params.n, 'n');
    let response = await this.api.post(
      '/images/generations',
      pickDefined({
        model: params.model,
        prompt: params.prompt,
        provider: params.provider ?? this.defaultProvider,
        n: params.n,
        size: params.size,
        quality: params.quality,
        style: params.style,
        response_format: params.responseFormat,
        image: params.image
      })
    );
    if (!Array.isArray(response.data?.data) || response.data.data.length === 0) {
      throw createApiServiceError('APIpie AI returned no generated images.');
    }
    return response.data;
  }

  async textToSpeech(params: TextToSpeechParams) {
    return this.api.post(
      '/audio/speech',
      pickDefined({
        model: params.model,
        voice: params.voice,
        input: params.input,
        provider: params.provider ?? this.defaultProvider,
        response_format: params.responseFormat,
        speed: params.speed,
        voice_settings: params.voiceSettings
          ? pickDefined({
              stability: params.voiceSettings.stability,
              similarity_boost: params.voiceSettings.similarityBoost,
              style: params.voiceSettings.style,
              use_speaker_boost: params.voiceSettings.useSpeakerBoost
            })
          : undefined
      }),
      { responseType: 'arraybuffer' }
    );
  }

  async createEmbeddings(params: EmbeddingsParams) {
    validateCount(params.dimensions, 'dimensions');
    let response = await this.api.post(
      '/embeddings',
      pickDefined({
        model: params.model,
        input: params.input,
        encoding_format: params.encodingFormat,
        dimensions: params.dimensions
      })
    );
    if (
      !Array.isArray(response.data?.data) ||
      response.data.data.some(
        (item: { embedding?: unknown }) =>
          !Array.isArray(item.embedding) ||
          item.embedding.some(
            (value: unknown) => typeof value !== 'number' || !Number.isFinite(value)
          )
      )
    ) {
      throw createApiServiceError('APIpie AI returned an invalid numeric embedding response.');
    }
    return response.data;
  }

  async listModels(params: ModelsParams = {}) {
    let response = await this.api.get('/models', {
      params: pickDefined({
        type: params.type,
        subtype: params.subtype,
        provider: params.provider,
        model: params.model,
        enabled: params.enabled,
        voices: params.voices ? '' : undefined
      })
    });
    if (!Array.isArray(response.data?.data)) {
      throw createApiServiceError('APIpie AI returned an invalid model catalog.');
    }
    return response.data;
  }

  async search(params: SearchParams) {
    validateCount(params.results, 'results');
    let response = await this.api.post(
      '/search',
      pickDefined({
        query: params.query,
        search_provider: params.searchProvider,
        geo: params.geo,
        lang: params.lang,
        results: params.results,
        safeSearch: params.safeSearch
      })
    );
    return response.data;
  }

  async scrape(params: ScrapeParams) {
    let response = await this.api.post('/scrape', pickDefined(params));
    return response.data;
  }

  async getUsage(params: UsageParams = {}) {
    validateCount(params.limit, 'limit');
    validateCount(params.offset, 'offset', 0);
    let response = await this.api.get('/queries/', { params: pickDefined(params) });
    if (!Array.isArray(response.data?.items)) {
      throw createApiServiceError('APIpie AI returned an invalid usage history response.');
    }
    return response.data;
  }

  async uploadRagDocument(params: RagUploadParams) {
    let response = await this.ragApi.post('/ragtune', pickDefined(params));
    return response.data;
  }

  async listRagCollections() {
    let response = await this.ragApi.post('/ragtune/listCollections', {});
    return response.data;
  }

  async deleteRagCollection(params: RagDeleteParams) {
    let response = await this.ragApi.post(
      '/ragtune/deleteCollection',
      pickDefined({
        collection: params.collection,
        collectionName: params.collection,
        deleteAll: params.deleteAll,
        ids: params.ids
      })
    );
    return response.data;
  }

  async getState(params: { user?: string; appName?: string } = {}) {
    let response = await this.api.get<StateResponse>('/state', {
      params: pickDefined({ user: params.user, app_name: params.appName })
    });
    return response.data;
  }

  async updateState(params: StateUpdateParams) {
    let response = await this.api.post<StateResponse>(
      '/state',
      pickDefined({
        settings: params.settings,
        delete: params.deleteKeys,
        enable_inline_cli: params.enableInlineCli,
        enable_user_states: params.enableUserStates,
        gui_only: params.guiOnly
      })
    );
    return response.data;
  }
}

export let createClient = (ctx: {
  auth: { token: string };
  config: { defaultProvider?: string; routing?: string };
}) =>
  new Client({
    token: ctx.auth.token,
    defaultProvider: ctx.config.defaultProvider,
    routing: ctx.config.routing
  });
