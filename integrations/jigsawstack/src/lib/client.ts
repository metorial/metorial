import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  pickDefined,
  requestAxios
} from 'slates';
import type { z } from 'zod';
import { responses } from './responses';

let downloads = createAxios();

let validateSources = (sources: Record<string, string | undefined>) => {
  if (
    Object.values(sources).filter(value => value !== undefined && value.trim().length > 0)
      .length !== 1
  ) {
    throw createApiServiceError(`Provide exactly one of ${Object.keys(sources).join(', ')}.`);
  }
};

let validateNumber = (
  name: string,
  value: number | undefined,
  min: number,
  max = Number.POSITIVE_INFINITY
) => {
  if (value !== undefined && (!Number.isFinite(value) || value < min || value > max)) {
    throw createApiServiceError(
      `${name} must be between ${min} and ${max === Number.POSITIVE_INFINITY ? 'the provider limit' : max}.`
    );
  }
};

let parseResponse = <T extends z.ZodType>(data: unknown, schema: T): z.output<T> => {
  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === false
  ) {
    throw buildApiServiceError(
      { response: { data } },
      { providerLabel: 'JigsawStack', reason: 'jigsawstack_api_error', operation: 'request' }
    );
  }
  let result = schema.safeParse(data);
  if (!result.success)
    throw createApiServiceError(
      'JigsawStack returned an unexpected response. Please retry the request.'
    );
  return result.data;
};

export class Client {
  private token: string;
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('Enter a JigsawStack API key.');
    this.token = config.token;
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.jigsawstack.com/v1',
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'JigsawStack',
          reason: 'jigsawstack_api_error',
          operation: 'request'
        })
    });
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
    features?: string[];
    scale?: number;
    sizePreset?: string;
  }) {
    validateSources({ url: params.url, html: params.html });
    validateNumber('pagePosition', params.pagePosition, 1);
    validateNumber('scale', params.scale, 1);
    let body: Record<string, unknown> = {};
    if (params.url !== undefined) body.url = params.url;
    if (params.html !== undefined) body.html = params.html;
    if (params.elementPrompts !== undefined) body.element_prompts = params.elementPrompts;
    if (params.selectors !== undefined) body.selectors = params.selectors;
    if (params.rootElementSelector !== undefined)
      body.root_element_selector = params.rootElementSelector;
    if (params.scroll !== undefined) body.scroll = params.scroll;
    if (params.pagePosition !== undefined) body.page_position = params.pagePosition;
    if (params.httpHeaders !== undefined) body.http_headers = params.httpHeaders;
    if (params.width !== undefined) body.width = params.width;
    if (params.height !== undefined) body.height = params.height;
    if (params.isMobile !== undefined) body.is_mobile = params.isMobile;
    Object.assign(
      body,
      pickDefined({
        features: params.features,
        scale: params.scale,
        size_preset: params.sizePreset
      })
    );

    let response = await this.api.post('/ai/scrape', body, { headers: this.headers });
    return parseResponse(response.data, responses.scrape);
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
    byoUrls?: string[];
  }) {
    if (params.query.length > 400)
      throw createApiServiceError('Search queries support at most 400 characters.');
    validateNumber('maxResults', params.maxResults, 1);
    let body: Record<string, unknown> = { query: params.query };
    if (params.aiOverview !== undefined) body.ai_overview = params.aiOverview;
    if (params.safeSearch !== undefined) body.safe_search = params.safeSearch;
    if (params.spellCheck !== undefined) body.spell_check = params.spellCheck;
    if (params.countryCode !== undefined) body.country_code = params.countryCode;
    if (params.autoScrape !== undefined) body.auto_scrape = params.autoScrape;
    if (params.maxResults !== undefined) body.max_results = params.maxResults;
    if (params.byoUrls !== undefined) body.byo_urls = params.byoUrls;

    let response = await this.api.post('/web/search', body, { headers: this.headers });
    return parseResponse(response.data, responses.search);
  }

  // Sentiment Analysis
  async analyzeSentiment(params: { text: string }) {
    let response = await this.api.post(
      '/ai/sentiment',
      { text: params.text },
      { headers: this.headers }
    );
    return parseResponse(response.data, responses.sentiment);
  }

  // Translation
  async translateText(params: {
    text: string | string[];
    targetLanguage: string;
    currentLanguage?: string;
  }) {
    if (
      (Array.isArray(params.text) ? params.text : [params.text]).some(
        text => text.length > 5000
      )
    )
      throw createApiServiceError('Each translated text supports at most 5000 characters.');
    let body: Record<string, unknown> = {
      text: params.text,
      target_language: params.targetLanguage
    };
    if (params.currentLanguage !== undefined) body.current_language = params.currentLanguage;

    let response = await this.api.post('/ai/translate', body, { headers: this.headers });
    return parseResponse(response.data, responses.translation);
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
    validateSources({ text: params.text, url: params.url, fileStoreKey: params.fileStoreKey });
    if (params.text !== undefined && params.text.length > 300000)
      throw createApiServiceError('Summary text supports at most 300000 characters.');
    validateNumber('maxPoints', params.maxPoints, 1, 100);
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.url !== undefined) body.url = params.url;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;
    if (params.type !== undefined) body.type = params.type;
    if (params.maxPoints !== undefined) body.max_points = params.maxPoints;
    if (params.maxCharacters !== undefined) body.max_characters = params.maxCharacters;

    let response = await this.api.post('/ai/summary', body, { headers: this.headers });
    return parseResponse(response.data, responses.summary);
  }

  // vOCR
  async extractFromImage(params: {
    url?: string;
    fileStoreKey?: string;
    prompt?: string | string[] | Record<string, string>;
    fineGrained?: boolean;
    pageRange?: number[];
  }) {
    validateSources({ url: params.url, fileStoreKey: params.fileStoreKey });
    if (
      params.pageRange !== undefined &&
      (params.pageRange.length !== 2 ||
        params.pageRange.some(page => !Number.isInteger(page) || page < 1) ||
        params.pageRange[0]! > params.pageRange[1]! ||
        params.pageRange[1]! - params.pageRange[0]! >= 10)
    )
      throw createApiServiceError(
        'pageRange must be [startPage, endPage], using positive whole numbers spanning at most 10 pages.'
      );
    let body: Record<string, unknown> = {};
    if (params.url !== undefined) body.url = params.url;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;
    if (params.prompt !== undefined) body.prompt = params.prompt;
    if (params.fineGrained !== undefined) body.fine_grained = params.fineGrained;
    if (params.pageRange !== undefined) body.page_range = params.pageRange;

    let response = await this.api.post('/vocr', body, { headers: this.headers });
    return parseResponse(response.data, responses.vision);
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
    wordTimestamps?: boolean;
  }) {
    validateSources({ url: params.url, fileStoreKey: params.fileStoreKey });
    validateNumber('batchSize', params.batchSize, 1, 40);
    validateNumber('chunkDuration', params.chunkDuration, 1, 15);
    let body: Record<string, unknown> = {};
    if (params.url !== undefined) body.url = params.url;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;
    if (params.language !== undefined) body.language = params.language;
    if (params.translate !== undefined) body.translate = params.translate;
    if (params.bySpeaker !== undefined) body.by_speaker = params.bySpeaker;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.batchSize !== undefined) body.batch_size = params.batchSize;
    if (params.chunkDuration !== undefined) body.chunk_duration = params.chunkDuration;
    if (params.wordTimestamps !== undefined) body.word_timestamps = params.wordTimestamps;

    let response = await this.api.post('/ai/transcribe', body, { headers: this.headers });
    if (response.data?.status === 'error')
      throw buildApiServiceError(
        { response },
        {
          providerLabel: 'JigsawStack',
          reason: 'jigsawstack_api_error',
          operation: 'transcription'
        }
      );
    return parseResponse(
      {
        ...response.data,
        success: response.data?.success ?? response.data?.status === 'processing'
      },
      responses.transcription
    );
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
      negativePrompt?: string;
      guidance?: number;
      seed?: number;
    };
  }) {
    if (params.prompt.length < 1 || params.prompt.length > 5000)
      throw createApiServiceError('The image prompt must contain 1-5000 characters.');
    validateNumber('width', params.width, 256, 1920);
    validateNumber('height', params.height, 256, 1920);
    validateNumber('steps', params.steps, 1, 90);
    validateNumber('guidance', params.advanceConfig?.guidance, 1, 28);
    let body: Record<string, unknown> = { prompt: params.prompt, return_type: 'url' };
    if (params.aspectRatio !== undefined) body.aspect_ratio = params.aspectRatio;
    if (params.width !== undefined) body.width = params.width;
    if (params.height !== undefined) body.height = params.height;
    if (params.steps !== undefined) body.steps = params.steps;
    if (params.outputFormat !== undefined) body.output_format = params.outputFormat;
    if (params.advanceConfig !== undefined) {
      body.advance_config = {
        negative_prompt: params.advanceConfig.negativePrompt,
        guidance: params.advanceConfig.guidance,
        seed: params.advanceConfig.seed
      };
    }

    let response = await this.api.post('/ai/image_generation', body, {
      headers: this.headers
    });
    return parseResponse(response.data, responses.fileUrl);
  }

  // Text to SQL
  async textToSql(params: {
    prompt: string;
    sqlSchema?: string;
    database?: string;
    fileStoreKey?: string;
  }) {
    if (params.sqlSchema !== undefined && params.fileStoreKey !== undefined)
      throw createApiServiceError('Provide sqlSchema or fileStoreKey, not both.');
    if (params.prompt.length < 10)
      throw createApiServiceError('The SQL prompt must contain at least 10 characters.');
    let body: Record<string, unknown> = { prompt: params.prompt };
    if (params.sqlSchema !== undefined) body.sql_schema = params.sqlSchema;
    if (params.database !== undefined) body.database = params.database;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;

    let response = await this.api.post('/ai/sql', body, { headers: this.headers });
    return parseResponse(response.data, responses.sql);
  }

  // Spell Check
  async checkSpelling(params: { text: string; languageCode?: string }) {
    let body: Record<string, unknown> = { text: params.text };
    if (params.languageCode !== undefined) body.language_code = params.languageCode;

    let response = await this.api.post('/validate/spell_check', body, {
      headers: this.headers
    });
    return parseResponse(response.data, responses.spelling);
  }

  // Profanity Check
  async checkProfanity(params: { text: string; censorReplacement?: string }) {
    let body: Record<string, unknown> = { text: params.text };
    if (params.censorReplacement !== undefined)
      body.censor_replacement = params.censorReplacement;

    let response = await this.api.post('/validate/profanity', body, { headers: this.headers });
    return parseResponse(response.data, responses.profanity);
  }

  // Spam Check
  async checkSpam(params: { text: string | string[] }) {
    let response = await this.api.post(
      '/validate/spam_check',
      { text: params.text },
      { headers: this.headers }
    );
    return parseResponse(response.data, responses.spam);
  }

  // NSFW Detection
  async detectNsfw(params: { url?: string; fileStoreKey?: string }) {
    validateSources({ url: params.url, fileStoreKey: params.fileStoreKey });
    let body: Record<string, unknown> = {};
    if (params.url !== undefined) body.url = params.url;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;

    let response = await this.api.post('/validate/nsfw', body, { headers: this.headers });
    return parseResponse(response.data, responses.nsfw);
  }

  // Object Detection
  async detectObjects(params: {
    url?: string;
    fileStoreKey?: string;
    prompts?: string[];
    features?: string[];
    annotatedImage?: boolean;
    returnMasks?: boolean;
  }) {
    validateSources({ url: params.url, fileStoreKey: params.fileStoreKey });
    if (params.prompts?.some(prompt => prompt.length < 1 || prompt.length > 150))
      throw createApiServiceError('Each object prompt must contain 1-150 characters.');
    if (params.features?.length === 0)
      throw createApiServiceError('Enable at least one object detection feature.');
    let body: Record<string, unknown> = {};
    if (params.url !== undefined) body.url = params.url;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;
    if (params.prompts !== undefined) body.prompts = params.prompts;
    if (params.features !== undefined) body.features = params.features;
    if (params.annotatedImage !== undefined) body.annotated_image = params.annotatedImage;
    if (params.returnMasks !== undefined) body.return_masks = params.returnMasks;
    body.return_type = 'url';

    let response = await this.api.post('/object_detection', body, { headers: this.headers });
    return parseResponse(response.data, responses.objects);
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
    scale?: number;
    sizePreset?: string;
    isMobile?: boolean;
    pdfPrintBackground?: boolean;
    pdfPageRange?: string;
  }) {
    validateSources({ html: params.html, url: params.url });
    validateNumber('quality', params.quality, 1, 100);
    validateNumber('scale', params.scale, 1);
    let body: Record<string, unknown> = {};
    if (params.html !== undefined) body.html = params.html;
    if (params.url !== undefined) body.url = params.url;
    if (params.type !== undefined) body.type = params.type;
    if (params.quality !== undefined) body.quality = params.quality;
    if (params.fullPage !== undefined) body.full_page = params.fullPage;
    if (params.omitBackground !== undefined) body.omit_background = params.omitBackground;
    if (params.width !== undefined) body.width = params.width;
    if (params.height !== undefined) body.height = params.height;
    if (params.darkMode !== undefined) body.dark_mode = params.darkMode;
    if (params.returnType !== undefined) body.return_type = params.returnType;
    Object.assign(
      body,
      pickDefined({
        scale: params.scale,
        size_preset: params.sizePreset,
        is_mobile: params.isMobile,
        pdf_print_background: params.pdfPrintBackground,
        pdf_page_range: params.pdfPageRange
      })
    );

    let response = await this.api.post('/web/html_to_any', body, { headers: this.headers });
    return parseResponse(response.data, responses.fileUrl);
  }

  // Time Series Prediction
  async predict(params: {
    dataset: Array<{ date: string; value: number | string }>;
    steps?: number;
  }) {
    if (params.dataset.length < 5 || params.dataset.length > 1000)
      throw createApiServiceError('The prediction dataset must contain 5-1000 data points.');
    validateNumber('steps', params.steps, 1, 500);
    if (
      params.dataset.some(
        point =>
          !/^\d{4}-\d{2}-\d{2}$/.test(point.date) ||
          !Number.isFinite(Number(point.value)) ||
          String(point.value).trim() === ''
      )
    )
      throw createApiServiceError(
        'Each data point must have a YYYY-MM-DD date and a numeric value.'
      );
    let body: Record<string, unknown> = { dataset: params.dataset };
    if (params.steps !== undefined) body.steps = params.steps;

    let response = await this.api.post('/ai/prediction', body, { headers: this.headers });
    return parseResponse(response.data, responses.prediction);
  }

  // Embedding
  async generateEmbedding(params: {
    text?: string;
    url?: string;
    fileStoreKey?: string;
    type: string;
    tokenOverflowMode?: string;
  }) {
    validateSources({ text: params.text, url: params.url, fileStoreKey: params.fileStoreKey });
    let body: Record<string, unknown> = { type: params.type };
    if (params.text !== undefined) body.text = params.text;
    if (params.url !== undefined) body.url = params.url;
    if (params.fileStoreKey !== undefined) body.file_store_key = params.fileStoreKey;
    if (params.tokenOverflowMode !== undefined)
      body.token_overflow_mode = params.tokenOverflowMode;

    let response = await this.api.post('/embedding', body, { headers: this.headers });
    return parseResponse(response.data, responses.embedding);
  }

  // Geo Search
  async geoSearch(params: {
    search: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  }) {
    let queryParams: Record<string, string> = { search: params.search };
    if (params.countryCode !== undefined) queryParams.country_code = params.countryCode;
    if (params.lat !== undefined) queryParams.lat = String(params.lat);
    if (params.lng !== undefined) queryParams.lng = String(params.lng);

    let response = await this.api.get('/geo/search', {
      headers: this.headers,
      params: queryParams
    });
    return parseResponse(response.data, responses.geo);
  }

  // Search Suggestions
  async getSearchSuggestions(params: { query: string }) {
    let response = await this.api.get('/web/search/suggest', {
      headers: this.headers,
      params: { query: params.query }
    });
    return parseResponse(response.data, responses.suggestions);
  }

  // File Upload
  async uploadFile(params: {
    file: unknown;
    key?: string;
    overwrite?: boolean;
    mimeType?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.key !== undefined) queryParams.key = params.key;
    if (params.overwrite !== undefined) queryParams.overwrite = String(params.overwrite);

    let response = await this.api.post('/store/file', params.file, {
      headers: {
        'x-api-key': this.token,
        'Content-Type': params.mimeType ?? 'application/octet-stream'
      },
      params: queryParams
    });
    return response.data;
  }

  getFileUrl(key: string) {
    return `https://api.jigsawstack.com/v1/store/file/read/${encodeURIComponent(key)}`;
  }

  async getFile(params: { key: string }) {
    let response = await this.api.get(this.getFileUrl(params.key), {
      responseType: 'arraybuffer'
    });
    let bytes = Buffer.from(response.data);
    let contentType = String(response.headers['content-type'] ?? '');
    if (contentType.includes('application/json')) {
      let data: unknown;
      try {
        data = JSON.parse(bytes.toString('utf8'));
      } catch {
        data = undefined;
      }
      if (responses.storedFile.safeParse(data).success) {
        let result = parseResponse(data, responses.storedFile);
        return {
          kind: 'metadata' as const,
          success: result.success,
          url: result.url,
          key: result.key
        };
      }
    }
    return {
      kind: 'binary' as const,
      success: true,
      url: this.getFileUrl(params.key),
      key: params.key
    };
  }

  async prepareGeneratedDownload(
    url: string,
    options: { filename: string; mimeType?: string }
  ) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createApiServiceError('JigsawStack returned an invalid file URL.');
    }
    if (parsed.protocol !== 'https:')
      throw createApiServiceError('JigsawStack returned an unsupported file URL.');
    let expiring = [...parsed.searchParams.keys()].some(key =>
      ['x-amz-signature', 'x-amz-expires', 'expires', 'signature'].includes(key.toLowerCase())
    );
    if (expiring) {
      return {
        type: 'content' as const,
        content: await this.downloadGeneratedFile(url),
        filename: options.filename,
        mimeType: options.mimeType
      };
    }
    return {
      type: 'url' as const,
      url,
      mimeType: options.mimeType,
      headers:
        parsed.origin === 'https://api.jigsawstack.com'
          ? { 'x-api-key': this.token }
          : undefined
    };
  }

  async downloadGeneratedFile(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createApiServiceError('JigsawStack returned an invalid file URL.');
    }
    if (parsed.protocol !== 'https:')
      throw createApiServiceError('JigsawStack returned an unsupported file URL.');
    let response = await requestAxios(
      'generated file download',
      () =>
        downloads.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          headers:
            parsed.origin === 'https://api.jigsawstack.com'
              ? { 'x-api-key': this.token }
              : undefined
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'JigsawStack',
          reason: 'jigsawstack_api_error',
          operation
        })
    );
    return new Response(response.data, {
      headers: {
        'content-type': String(response.headers['content-type'] ?? 'application/octet-stream')
      }
    });
  }

  async classify(params: {
    dataset: Array<{ type: 'text' | 'image'; value: string }>;
    labels: Array<{
      type: 'text' | 'image';
      value: string;
      key?: string | number;
      text?: string;
    }>;
    multipleLabels?: boolean;
    task?: string;
  }) {
    if (new Set(params.dataset.map(item => item.type)).size !== 1) {
      throw createApiServiceError('All dataset items must have the same type: text or image.');
    }
    let labels = new Set(
      params.labels.map((item, index) =>
        item.key === undefined ? `label:${index}` : `${typeof item.key}:${item.key}`
      )
    );
    if (labels.size < 2)
      throw createApiServiceError('Provide at least two distinct classification labels.');
    let response = await this.api.post(
      '/classification',
      pickDefined({
        dataset: params.dataset,
        labels: params.labels,
        multiple_labels: params.multipleLabels,
        task: params.task
      })
    );
    return parseResponse(response.data, responses.classification);
  }

  async generateEmbeddingV2(params: {
    text?: string;
    url?: string;
    fileStoreKey?: string;
    type: string;
    tokenOverflowMode?: string;
    dimensions?: number;
    instruction?: string;
    query?: boolean;
    speakerFingerprint?: boolean;
  }) {
    validateSources({ text: params.text, url: params.url, fileStoreKey: params.fileStoreKey });
    if (params.speakerFingerprint && params.type !== 'audio')
      throw createApiServiceError('Speaker fingerprints require audio content.');
    if ((params.query || params.instruction !== undefined) && params.type !== 'text')
      throw createApiServiceError('Query mode and instructions require text content.');
    let response = await this.api.post(
      'https://api.jigsawstack.com/v2/embedding',
      pickDefined({
        text: params.text,
        url: params.url,
        file_store_key: params.fileStoreKey,
        type: params.type,
        token_overflow_mode: params.tokenOverflowMode,
        dimensions: params.dimensions,
        instruction: params.instruction,
        query: params.query,
        speaker_fingerprint: params.speakerFingerprint
      })
    );
    return parseResponse(response.data, responses.embedding);
  }

  // File Delete
  async deleteFile(params: { key: string }) {
    let response = await this.api.delete(
      `/store/file/read/${encodeURIComponent(params.key)}`,
      {
        headers: this.headers,
        params: { key: params.key }
      }
    );
    return parseResponse(response.data, responses.deleted);
  }
}
