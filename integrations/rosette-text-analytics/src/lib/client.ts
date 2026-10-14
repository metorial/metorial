import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface RosetteClientConfig {
  token?: string;
  baseUrl: string;
}

export interface NameObject {
  text: string;
  language?: string;
  script?: string;
  entityType?: string;
}

export interface AddressObject {
  houseNumber?: string;
  road?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | undefined;
}

export interface RecordField {
  type: string;
  weight?: number;
  scoreIfNull?: number;
}

export interface RecordSimilarityRequest {
  fields: Record<string, RecordField>;
  records: {
    left: Record<string, unknown>[];
    right: Record<string, unknown>[];
  };
  properties?: Record<string, unknown>;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: RosetteClientConfig) {
    let baseUrl: URL;
    try {
      baseUrl = new URL(config.baseUrl);
    } catch {
      throw createApiServiceError('Enter a valid HTTP or HTTPS Analytics API base URL.');
    }
    if (!['http:', 'https:'].includes(baseUrl.protocol)) {
      throw createApiServiceError('The Analytics API base URL must use HTTP or HTTPS.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl.replace(/\/+$/, ''),
      timeout: 30_000,
      authHeader: config.token ? { name: 'X-RosetteAPI-Key', value: config.token } : undefined,
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Rosette Text Analytics',
          reason: 'upstream_error'
        })
    });
  }

  // -- Document analysis endpoints --

  async detectLanguage(content: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/language', {
      content,
      ...options
    });
    return response.data;
  }

  async extractEntities(
    content: string,
    language?: string,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/entities', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async analyzeSentiment(
    content: string,
    language?: string,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/sentiment', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async categorize(content: string, language?: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/categories', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async extractTopics(content: string, language?: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/topics', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async extractRelationships(
    content: string,
    language?: string,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/relationships', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async extractEvents(content: string, language?: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/events', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  // -- Name endpoints --

  async nameSimilarity(
    name1: NameObject,
    name2: NameObject,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/name-similarity', {
      name1,
      name2,
      ...options
    });
    return response.data;
  }

  async nameTranslation(params: {
    name: string;
    entityType?: string;
    sourceLanguageOfOrigin?: string;
    sourceLanguageOfUse?: string;
    sourceScript?: string;
    targetLanguage: string;
    targetScript?: string;
    targetScheme?: string;
    maximumResults?: number;
  }) {
    let response = await this.axios.post('/name-translation', params);
    return response.data;
  }

  async nameDeduplication(
    names: NameObject[],
    threshold: number,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/name-deduplication', {
      names,
      threshold,
      ...options
    });
    return response.data;
  }

  // -- Linguistic endpoints --

  async morphology(
    content: string,
    morphologyType: string,
    language?: string,
    options?: Record<string, unknown>
  ) {
    let endpoint =
      morphologyType === 'complete' ? '/morphology/complete' : `/morphology/${morphologyType}`;
    let response = await this.axios.post(endpoint, {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async tokenize(content: string, language?: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/tokens', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async detectSentences(
    content: string,
    language?: string,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/sentences', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async syntaxDependencies(
    content: string,
    language?: string,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/syntax/dependencies', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async transliterate(content: string, language?: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/transliteration', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  async textEmbedding(content: string, language?: string, options?: Record<string, unknown>) {
    let response = await this.axios.post('/semantics/vector', {
      content,
      ...(language ? { language } : {}),
      ...options
    });
    return response.data;
  }

  // -- Similarity endpoints --

  async addressSimilarity(
    address1: AddressObject | string,
    address2: AddressObject | string,
    options?: Record<string, unknown>
  ) {
    let response = await this.axios.post('/address-similarity', {
      address1: this.normalizeAddress(address1),
      address2: this.normalizeAddress(address2),
      ...options
    });
    return response.data;
  }

  async recordSimilarity(request: RecordSimilarityRequest) {
    let response = await this.axios.post('/record-similarity', request);
    return response.data;
  }

  // -- Utility endpoints --

  async ping() {
    let response = await this.axios.get('/ping');
    return response.data;
  }

  async info() {
    let response = await this.axios.get('/info');
    return response.data;
  }

  async supportedLanguages(endpoint: string) {
    let response = await this.axios.get(`/${endpoint}/supported-languages`);
    return response.data;
  }

  private normalizeAddress(address: AddressObject | string) {
    if (typeof address === 'string') return address;
    let { postalCode, ...fields } = address;
    return { ...fields, ...(postalCode !== undefined ? { postCode: postalCode } : {}) };
  }
}
