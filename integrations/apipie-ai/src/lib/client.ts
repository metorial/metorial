import { createAxios } from 'slates';

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
  responseFormat?: Record<string, unknown>;
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

export class Client {
  private token: string;
  private defaultProvider?: string;
  private routing?: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.defaultProvider = config.defaultProvider;
    this.routing = config.routing;
  }

  private createAxiosInstance(baseURL: string = 'https://apipie.ai/v1') {
    return createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async chatCompletion(params: ChatCompletionParams) {
    let axios = this.createAxiosInstance();
    let body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages
    };

    if (params.provider ?? this.defaultProvider)
      body.provider = params.provider ?? this.defaultProvider;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.topK !== undefined) body.top_k = params.topK;
    if (params.frequencyPenalty !== undefined)
      body.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined) body.presence_penalty = params.presencePenalty;
    if (params.n !== undefined) body.n = params.n;
    if (params.routing ?? this.routing) body.routing = params.routing ?? this.routing;
    if (params.ragTune) body.rag_tune = params.ragTune;
    if (params.integrity !== undefined) body.integrity = params.integrity;
    if (params.memory !== undefined) body.memory = params.memory;
    if (params.memSession) body.mem_session = params.memSession;
    if (params.memExpire !== undefined) body.mem_expire = params.memExpire;
    if (params.memClear) body.mem_clear = 1;
    if (params.online !== undefined) body.online = params.online;
    if (params.searches !== undefined) body.searches = params.searches;
    if (params.pull !== undefined) body.pull = params.pull;
    if (params.use !== undefined) body.use = params.use;
    if (params.scrapeLength !== undefined) body.scrape_length = params.scrapeLength;
    if (params.searchLang) body.search_lang = params.searchLang;
    if (params.searchGeo) body.search_geo = params.searchGeo;
    if (params.webSearchContextSize)
      body.web_search_options = { search_context_size: params.webSearchContextSize };
    if (params.tools) body.tools = params.tools;
    if (params.toolChoice) body.tool_choice = params.toolChoice;
    if (params.responseFormat) body.response_format = params.responseFormat;

    let response = await axios.post('/chat/completions', body);
    return response.data;
  }

  async generateImage(params: ImageGenerationParams) {
    let axios = this.createAxiosInstance();
    let body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt
    };

    if (params.provider ?? this.defaultProvider)
      body.provider = params.provider ?? this.defaultProvider;
    if (params.n !== undefined) body.n = params.n;
    if (params.size) body.size = params.size;
    if (params.quality) body.quality = params.quality;
    if (params.style) body.style = params.style;
    if (params.responseFormat) body.response_format = params.responseFormat;
    if (params.image) body.image = params.image;

    let response = await axios.post('/images/generations', body);
    return response.data;
  }

  async textToSpeech(params: TextToSpeechParams) {
    let axios = this.createAxiosInstance();
    let body: Record<string, unknown> = {
      model: params.model,
      voice: params.voice,
      input: params.input
    };

    if (params.provider ?? this.defaultProvider)
      body.provider = params.provider ?? this.defaultProvider;
    if (params.responseFormat) body.response_format = params.responseFormat;
    if (params.speed !== undefined) body.speed = params.speed;
    if (params.voiceSettings) {
      body.voice_settings = {
        stability: params.voiceSettings.stability,
        similarity_boost: params.voiceSettings.similarityBoost,
        style: params.voiceSettings.style,
        use_speaker_boost: params.voiceSettings.useSpeakerBoost
      };
    }

    let response = await axios.post('/audio/speech', body);
    return response;
  }

  async createEmbeddings(params: EmbeddingsParams) {
    let axios = this.createAxiosInstance();
    let body: Record<string, unknown> = {
      model: params.model,
      input: params.input
    };

    if (params.encodingFormat) body.encoding_format = params.encodingFormat;
    if (params.dimensions !== undefined) body.dimensions = params.dimensions;

    let response = await axios.post('/embeddings', body);
    return response.data;
  }

  async listModels(params: ModelsParams = {}) {
    let axios = this.createAxiosInstance();
    let queryParams: Record<string, unknown> = {};

    if (params.type) queryParams.type = params.type;
    if (params.subtype) queryParams.subtype = params.subtype;
    if (params.provider) queryParams.provider = params.provider;
    if (params.model) queryParams.model = params.model;
    if (params.enabled !== undefined) queryParams.enabled = params.enabled;
    if (params.voices) queryParams.voices = '';

    let response = await axios.get('/models', { params: queryParams });
    return response.data;
  }

  async search(params: SearchParams) {
    let axios = this.createAxiosInstance();
    let body: Record<string, unknown> = {
      query: params.query
    };

    if (params.searchProvider) body.search_provider = params.searchProvider;
    if (params.geo) body.geo = params.geo;
    if (params.lang) body.lang = params.lang;
    if (params.results !== undefined) body.results = params.results;
    if (params.safeSearch !== undefined) body.safeSearch = params.safeSearch;

    let response = await axios.post('/search', body);
    return response.data;
  }

  async scrape(params: ScrapeParams) {
    let axios = this.createAxiosInstance();
    let body: Record<string, unknown> = {
      url: params.url
    };

    if (params.format) body.format = params.format;

    let response = await axios.post('/scrape', body);
    return response.data;
  }

  async getUsage(params: UsageParams = {}) {
    let axios = this.createAxiosInstance();
    let queryParams: Record<string, unknown> = {};

    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;

    let response = await axios.get('/queries/', { params: queryParams });
    return response.data;
  }

  async uploadRagDocument(params: RagUploadParams) {
    let axios = this.createAxiosInstance('https://apipie.ai');
    let body: Record<string, unknown> = {
      collection: params.collection,
      url: params.url
    };

    if (params.metatag) body.metatag = params.metatag;

    let response = await axios.post('/ragtune', body);
    return response.data;
  }

  async listRagCollections() {
    let axios = this.createAxiosInstance('https://apipie.ai');
    let response = await axios.post('/ragtune/listCollections', {});
    return response.data;
  }

  async deleteRagCollection(params: RagDeleteParams) {
    let axios = this.createAxiosInstance('https://apipie.ai');
    let body: Record<string, unknown> = {
      collection: params.collection,
      collectionName: params.collection
    };

    if (params.deleteAll !== undefined) body.deleteAll = params.deleteAll;
    if (params.ids) body.ids = params.ids;

    let response = await axios.post('/ragtune/deleteCollection', body);
    return response.data;
  }
}

export let createClient = (ctx: {
  auth: { token: string };
  config: { defaultProvider?: string; routing?: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    defaultProvider: ctx.config.defaultProvider,
    routing: ctx.config.routing
  });
};
