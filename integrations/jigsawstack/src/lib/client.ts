import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.jigsawstack.com/v1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'x-api-key': this.token,
      'Content-Type': 'application/json'
    };
  }

  // Web Scraping
  async scrapeWeb(params: {
    url?: string;
    html?: string;
    elementPrompts?: string[] | Record<string, string>;
    selectors?: string[];
    rootElementSelector?: string;
    scroll?: boolean;
    pagePosition?: number;
    httpHeaders?: Record<string, string>;
    width?: number;
    height?: number;
    isMobile?: boolean;
  }) {
    let body: Record<string, unknown> = {};
    if (params.url) body.url = params.url;
    if (params.html) body.html = params.html;
    if (params.elementPrompts) body.element_prompts = params.elementPrompts;
    if (params.selectors) body.selectors = params.selectors;
    if (params.rootElementSelector) body.root_element_selector = params.rootElementSelector;
    if (params.scroll !== undefined) body.scroll = params.scroll;
    if (params.pagePosition !== undefined) body.page_position = params.pagePosition;
    if (params.httpHeaders) body.http_headers = params.httpHeaders;
    if (params.width) body.width = params.width;
    if (params.height) body.height = params.height;
    if (params.isMobile !== undefined) body.is_mobile = params.isMobile;

    let response = await api.post('/ai/scrape', body, { headers: this.headers });
    return response.data;
  }

  // Web Search
  async searchWeb(params: {
    query: string;
    aiOverview?: boolean;
    safeSearch?: string;
    spellCheck?: boolean;
    countryCode?: string;
    autoScrape?: boolean;
    maxResults?: number;
  }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.aiOverview !== undefined) body.ai_overview = params.aiOverview;
    if (params.safeSearch) body.safe_search = params.safeSearch;
    if (params.spellCheck !== undefined) body.spell_check = params.spellCheck;
    if (params.countryCode) body.country_code = params.countryCode;
    if (params.autoScrape !== undefined) body.auto_scrape = params.autoScrape;
    if (params.maxResults) body.max_results = params.maxResults;

    let response = await api.post('/web/search', body, { headers: this.headers });
    return response.data;
  }

  // Sentiment Analysis
  async analyzeSentiment(params: { text: string }) {
    let response = await api.post(
      '/ai/sentiment',
      { text: params.text },
      { headers: this.headers }
    );
    return response.data;
  }

  // Translation
  async translateText(params: {
    text: string | string[];
    targetLanguage: string;
    currentLanguage?: string;
  }) {
    let body: Record<string, unknown> = {
      text: params.text,
      target_language: params.targetLanguage
    };
    if (params.currentLanguage) body.current_language = params.currentLanguage;

    let response = await api.post('/ai/translate', body, { headers: this.headers });
    return response.data;
  }

  // Summarization
  async summarizeText(params: {
    text?: string;
    url?: string;
    fileStoreKey?: string;
    type?: string;
    maxPoints?: number;
    maxCharacters?: number;
  }) {
    let body: Record<string, unknown> = {};
    if (params.text) body.text = params.text;
    if (params.url) body.url = params.url;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;
    if (params.type) body.type = params.type;
    if (params.maxPoints) body.max_points = params.maxPoints;
    if (params.maxCharacters) body.max_characters = params.maxCharacters;

    let response = await api.post('/ai/summary', body, { headers: this.headers });
    return response.data;
  }

  // vOCR
  async extractFromImage(params: {
    url?: string;
    fileStoreKey?: string;
    prompt?: string | string[] | Record<string, string>;
    fineGrained?: boolean;
    pageRange?: number[];
  }) {
    let body: Record<string, unknown> = {};
    if (params.url) body.url = params.url;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;
    if (params.prompt) body.prompt = params.prompt;
    if (params.fineGrained !== undefined) body.fine_grained = params.fineGrained;
    if (params.pageRange) body.page_range = params.pageRange;

    let response = await api.post('/vocr', body, { headers: this.headers });
    return response.data;
  }

  // Speech to Text
  async transcribeAudio(params: {
    url?: string;
    fileStoreKey?: string;
    language?: string;
    translate?: boolean;
    bySpeaker?: boolean;
    webhookUrl?: string;
    batchSize?: number;
    chunkDuration?: number;
  }) {
    let body: Record<string, unknown> = {};
    if (params.url) body.url = params.url;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;
    if (params.language) body.language = params.language;
    if (params.translate !== undefined) body.translate = params.translate;
    if (params.bySpeaker !== undefined) body.by_speaker = params.bySpeaker;
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.batchSize) body.batch_size = params.batchSize;
    if (params.chunkDuration) body.chunk_duration = params.chunkDuration;

    let response = await api.post('/ai/transcribe', body, { headers: this.headers });
    return response.data;
  }

  // Image Generation
  async generateImage(params: {
    prompt: string;
    aspectRatio?: string;
    width?: number;
    height?: number;
    steps?: number;
    outputFormat?: string;
    advanceConfig?: {
      negativePompt?: string;
      guidance?: number;
      seed?: number;
    };
  }) {
    let body: Record<string, unknown> = { prompt: params.prompt };
    if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
    if (params.width) body.width = params.width;
    if (params.height) body.height = params.height;
    if (params.steps) body.steps = params.steps;
    if (params.outputFormat) body.output_format = params.outputFormat;
    if (params.advanceConfig) {
      body.advance_config = {
        negative_prompt: params.advanceConfig.negativePompt,
        guidance: params.advanceConfig.guidance,
        seed: params.advanceConfig.seed
      };
    }

    let response = await api.post('/ai/image_generation', body, { headers: this.headers });
    return response.data;
  }

  // Text to SQL
  async textToSql(params: {
    prompt: string;
    sqlSchema?: string;
    database?: string;
    fileStoreKey?: string;
  }) {
    let body: Record<string, unknown> = { prompt: params.prompt };
    if (params.sqlSchema) body.sql_schema = params.sqlSchema;
    if (params.database) body.database = params.database;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;

    let response = await api.post('/ai/sql', body, { headers: this.headers });
    return response.data;
  }

  // Spell Check
  async checkSpelling(params: { text: string; languageCode?: string }) {
    let body: Record<string, unknown> = { text: params.text };
    if (params.languageCode) body.language_code = params.languageCode;

    let response = await api.post('/validate/spell_check', body, { headers: this.headers });
    return response.data;
  }

  // Profanity Check
  async checkProfanity(params: { text: string; censorReplacement?: string }) {
    let body: Record<string, unknown> = { text: params.text };
    if (params.censorReplacement) body.censor_replacement = params.censorReplacement;

    let response = await api.post('/validate/profanity', body, { headers: this.headers });
    return response.data;
  }

  // Spam Check
  async checkSpam(params: { text: string | string[] }) {
    let response = await api.post(
      '/validate/spam_check',
      { text: params.text },
      { headers: this.headers }
    );
    return response.data;
  }

  // NSFW Detection
  async detectNsfw(params: { url?: string; fileStoreKey?: string }) {
    let body: Record<string, unknown> = {};
    if (params.url) body.url = params.url;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;

    let response = await api.post('/validate/nsfw', body, { headers: this.headers });
    return response.data;
  }

  // Object Detection
  async detectObjects(params: {
    url?: string;
    fileStoreKey?: string;
    prompts?: string[];
    features?: string[];
    annotatedImage?: boolean;
  }) {
    let body: Record<string, unknown> = {};
    if (params.url) body.url = params.url;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;
    if (params.prompts) body.prompts = params.prompts;
    if (params.features) body.features = params.features;
    if (params.annotatedImage !== undefined) body.annotated_image = params.annotatedImage;

    let response = await api.post('/object_detection', body, { headers: this.headers });
    return response.data;
  }

  // HTML to Any
  async convertHtml(params: {
    html?: string;
    url?: string;
    type?: string;
    quality?: number;
    fullPage?: boolean;
    omitBackground?: boolean;
    width?: number;
    height?: number;
    darkMode?: boolean;
    returnType?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (params.html) body.html = params.html;
    if (params.url) body.url = params.url;
    if (params.type) body.type = params.type;
    if (params.quality) body.quality = params.quality;
    if (params.fullPage !== undefined) body.full_page = params.fullPage;
    if (params.omitBackground !== undefined) body.omit_background = params.omitBackground;
    if (params.width) body.width = params.width;
    if (params.height) body.height = params.height;
    if (params.darkMode !== undefined) body.dark_mode = params.darkMode;
    if (params.returnType) body.return_type = params.returnType;

    let response = await api.post('/web/html_to_any', body, { headers: this.headers });
    return response.data;
  }

  // Time Series Prediction
  async predict(params: {
    dataset: Array<{ date: string; value: number | string }>;
    steps?: number;
  }) {
    let body: Record<string, unknown> = { dataset: params.dataset };
    if (params.steps) body.steps = params.steps;

    let response = await api.post('/ai/prediction', body, { headers: this.headers });
    return response.data;
  }

  // Embedding
  async generateEmbedding(params: {
    text?: string;
    url?: string;
    fileStoreKey?: string;
    type: string;
    tokenOverflowMode?: string;
  }) {
    let body: Record<string, unknown> = { type: params.type };
    if (params.text) body.text = params.text;
    if (params.url) body.url = params.url;
    if (params.fileStoreKey) body.file_store_key = params.fileStoreKey;
    if (params.tokenOverflowMode) body.token_overflow_mode = params.tokenOverflowMode;

    let response = await api.post('/embedding', body, { headers: this.headers });
    return response.data;
  }

  // Geo Search
  async geoSearch(params: {
    search: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  }) {
    let queryParams: Record<string, string> = { search: params.search };
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.lat !== undefined) queryParams.lat = String(params.lat);
    if (params.lng !== undefined) queryParams.lng = String(params.lng);

    let response = await api.get('/geo/search', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // Search Suggestions
  async getSearchSuggestions(params: { query: string }) {
    let response = await api.get('/web/search/suggest', {
      headers: this.headers,
      params: { query: params.query }
    });
    return response.data;
  }

  // File Upload
  async uploadFile(params: { file: unknown; key?: string; overwrite?: boolean }) {
    let queryParams: Record<string, string> = {};
    if (params.key) queryParams.key = params.key;
    if (params.overwrite !== undefined) queryParams.overwrite = String(params.overwrite);

    let response = await api.post('/store/file', params.file, {
      headers: {
        'x-api-key': this.token
      },
      params: queryParams
    });
    return response.data;
  }

  // File Retrieve
  async getFile(params: { key: string }) {
    let response = await api.get(`/store/file/read/${encodeURIComponent(params.key)}`, {
      headers: this.headers,
      params: { key: params.key }
    });
    return response.data;
  }

  // File Delete
  async deleteFile(params: { key: string }) {
    let response = await api.delete(`/store/file/read/${encodeURIComponent(params.key)}`, {
      headers: this.headers,
      params: { key: params.key }
    });
    return response.data;
  }
}
