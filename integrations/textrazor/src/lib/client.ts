import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface AnalyzeTextParams {
  text?: string;
  url?: string;
  extractors: string[];
  languageOverride?: string;
  cleanupMode?: 'raw' | 'stripTags' | 'cleanHTML';
  cleanupReturnCleaned?: boolean;
  cleanupReturnRaw?: boolean;
  cleanupUseMetadata?: boolean;
  downloadRunJavascript?: boolean;
  entityIncludeAddressPlaces?: boolean;
  entityDictionaries?: string[];
  entityFilterDbpediaTypes?: string[];
  entityFilterFreebaseTypes?: string[];
  entityAllowOverlap?: boolean;
  classifiers?: string[];
  rules?: string;
}

export interface AnalyzeTextResponse {
  time: number;
  ok: boolean;
  error?: string;
  message?: string;
  language?: string;
  languageIsReliable?: boolean;
  cleanedText?: string;
  rawText?: string;
  sentences?: Array<{
    words: Array<{
      position: number;
      startingPos: number;
      endingPos: number;
      token: string;
      stem?: string;
      lemma?: string;
      partOfSpeech?: string;
      parentPosition?: number | null;
      relationToParent?: string | null;
      senses?: Array<{ sense?: string; synset?: string; score: number }>;
      spellingSuggestions?: Array<{ suggestion: string; score: number }>;
    }>;
  }>;
  entities?: Array<{
    entityId?: string | null;
    entityEnglishId?: string | null;
    customEntityId?: string;
    confidenceScore?: number;
    relevanceScore?: number;
    type?: string[];
    freebaseTypes?: string[];
    freebaseId?: string | null;
    wikidataId?: string | null;
    wikiLink?: string | null;
    matchingTokens?: number[];
    matchedText?: string;
    data?: Record<string, string[]>;
  }>;
  topics?: Array<{
    label: string;
    score: number;
    wikiLink?: string | null;
    wikidataId?: string | null;
  }>;
  categories?: Array<{
    categoryId: string;
    label?: string;
    score: number;
    classifierId?: string;
  }>;
  relations?: Array<{
    wordPositions: number[];
    params: Array<{
      relation: string;
      wordPositions: number[];
    }>;
  }>;
  entailments?: Array<{
    wordPositions: number[];
    score: number;
    priorScore?: number;
    contextScore?: number;
    entailedTree?: Record<string, unknown>;
  }>;
  nounPhrases?: Array<{
    wordPositions: number[];
  }>;
  properties?: Array<{
    wordPositions: number[];
    propertyPositions: number[];
  }>;
  customAnnotationOutput?: string;
  matchingRules?: Record<string, unknown>[];
}

export interface AccountInfo {
  plan: string;
  concurrentRequestLimit: number;
  concurrentRequestsUsed: number;
  planDailyIncludedRequests: number;
  requestsUsedToday: number;
}

export interface DictionaryInfo {
  id: string;
  matchType?: string;
  caseInsensitive?: boolean;
  language?: string;
}

export interface DictionaryEntry {
  id?: string;
  text: string;
  data?: Record<string, string[]>;
}

export interface ClassifierCategory {
  categoryId: string;
  label?: string;
  query: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('A TextRazor API key is required. Reconnect your account.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.textrazor.com',
      authHeader: { name: 'X-TextRazor-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'TextRazor',
          reason: 'textrazor_api_error'
        })
    });
    this.http.interceptors.response.use(response => {
      if (response.data?.ok === false) {
        throw createApiServiceError(
          `TextRazor request failed: ${response.data.error || response.data.message || 'The provider could not process the request.'}`,
          { reason: 'textrazor_api_error' }
        );
      }
      return response;
    });
  }

  private unwrap<T>(data: { response?: T }): T {
    if (data?.response === undefined || data.response === null) {
      throw createApiServiceError('TextRazor returned an incomplete response. Try again.', {
        reason: 'textrazor_invalid_response'
      });
    }
    return data.response;
  }

  async analyzeText(params: AnalyzeTextParams) {
    let hasText = params.text !== undefined;
    let hasUrl = params.url !== undefined;
    if (hasText === hasUrl) {
      throw createApiServiceError('Provide exactly one of text or sourceUrl to analyze.');
    }
    if ((hasText && !params.text?.trim()) || (hasUrl && !params.url?.trim())) {
      throw createApiServiceError('The text or sourceUrl to analyze must not be empty.');
    }
    if (params.text !== undefined && Buffer.byteLength(params.text, 'utf8') > 200 * 1024) {
      throw createApiServiceError('Text must contain no more than 200KB of UTF-8 data.');
    }
    if (params.url) {
      let url: URL;
      try {
        url = new URL(params.url);
      } catch {
        throw createApiServiceError(
          'sourceUrl must be a valid publicly accessible HTTP or HTTPS URL.'
        );
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw createApiServiceError('sourceUrl must use HTTP or HTTPS.');
      }
    }
    let formData = new URLSearchParams();

    if (params.text) {
      formData.append('text', params.text);
    }
    if (params.url) {
      formData.append('url', params.url);
    }

    formData.append('extractors', params.extractors.join(','));

    if (params.languageOverride) {
      formData.append('languageOverride', params.languageOverride);
    }
    if (params.cleanupMode) {
      formData.append('cleanup.mode', params.cleanupMode);
    }
    if (params.cleanupReturnCleaned !== undefined) {
      formData.append('cleanup.returnCleaned', String(params.cleanupReturnCleaned));
    }
    if (params.cleanupReturnRaw !== undefined) {
      formData.append('cleanup.returnRaw', String(params.cleanupReturnRaw));
    }
    if (params.cleanupUseMetadata !== undefined) {
      formData.append('cleanup.useMetadata', String(params.cleanupUseMetadata));
    }
    if (params.downloadRunJavascript !== undefined) {
      formData.append('download.runJavascript', String(params.downloadRunJavascript));
    }
    if (params.entityIncludeAddressPlaces !== undefined) {
      formData.append(
        'entities.includeAddressPlaces',
        String(params.entityIncludeAddressPlaces)
      );
    }
    if (params.entityDictionaries) {
      for (let dict of params.entityDictionaries) {
        formData.append('entities.dictionaries', dict);
      }
    }
    if (params.entityFilterDbpediaTypes) {
      for (let type of params.entityFilterDbpediaTypes) {
        formData.append('entities.filterDbpediaTypes', type);
      }
    }
    if (params.entityFilterFreebaseTypes) {
      for (let type of params.entityFilterFreebaseTypes) {
        formData.append('entities.filterFreebaseTypes', type);
      }
    }
    if (params.entityAllowOverlap !== undefined) {
      formData.append('entities.allowOverlap', String(params.entityAllowOverlap));
    }
    if (params.classifiers) {
      formData.append('classifiers', params.classifiers.join(','));
    }
    if (params.rules) {
      formData.append('rules', params.rules);
    }

    let response = await this.http.post('/', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let data = response.data;
    let result = this.unwrap<Omit<AnalyzeTextResponse, 'time' | 'ok'>>(data);
    return {
      ...result,
      time: data.time,
      ok: data.ok,
      error: data.error,
      message: data.message,
      sentences: result.sentences?.map(sentence => ({
        ...sentence,
        words: (sentence.words ?? []).map(word => ({
          ...word,
          parentPosition: word.parentPosition ?? undefined,
          relationToParent: word.relationToParent ?? undefined,
          senses: word.senses?.map(sense => {
            let synset = sense.synset ?? sense.sense;
            if (!synset) {
              throw createApiServiceError(
                'TextRazor returned a word sense without an identifier.',
                {
                  reason: 'textrazor_invalid_response'
                }
              );
            }
            return { synset, score: sense.score };
          })
        }))
      })),
      entities: result.entities?.map(entity => ({
        ...entity,
        entityId: entity.entityId ?? undefined,
        entityEnglishId: entity.entityEnglishId ?? undefined,
        freebaseId: entity.freebaseId ?? undefined,
        wikidataId: entity.wikidataId ?? undefined,
        wikiLink: entity.wikiLink ?? undefined
      })),
      topics: result.topics?.map(topic => ({
        ...topic,
        wikidataId: topic.wikidataId ?? undefined,
        wikiLink: topic.wikiLink ?? undefined
      }))
    };
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.http.get('/account/');
    let account = this.unwrap<AccountInfo & { planDailyRequestsIncluded?: number }>(
      response.data
    );
    let includedRequests =
      account.planDailyIncludedRequests ?? account.planDailyRequestsIncluded;
    if (includedRequests === undefined) {
      throw createApiServiceError(
        'TextRazor returned account details without a daily request allowance.',
        {
          reason: 'textrazor_invalid_response'
        }
      );
    }
    return { ...account, planDailyIncludedRequests: includedRequests };
  }

  // Dictionary management
  async createDictionary(
    dictionaryId: string,
    options?: {
      matchType?: 'stem' | 'token';
      caseInsensitive?: boolean;
      language?: string;
    }
  ): Promise<void> {
    await this.http.put(`/entities/${encodeURIComponent(dictionaryId)}`, options ?? {}, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async listDictionaries(): Promise<DictionaryInfo[]> {
    let response = await this.http.get('/entities/');
    return response.data.dictionaries ?? [];
  }

  async getDictionary(dictionaryId: string): Promise<DictionaryInfo> {
    let response = await this.http.get(`/entities/${encodeURIComponent(dictionaryId)}`);
    return this.unwrap(response.data);
  }

  async deleteDictionary(dictionaryId: string): Promise<void> {
    await this.http.delete(`/entities/${encodeURIComponent(dictionaryId)}`);
  }

  // Dictionary entry management
  async listDictionaryEntries(
    dictionaryId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ entries: DictionaryEntry[]; total: number }> {
    let response = await this.http.get(`/entities/${encodeURIComponent(dictionaryId)}/_all`, {
      params: { limit, offset }
    });
    let result = this.unwrap<{ entries?: DictionaryEntry[]; total?: number }>(response.data);
    return {
      entries: result.entries ?? [],
      total: result.total ?? 0
    };
  }

  async addDictionaryEntries(dictionaryId: string, entries: DictionaryEntry[]): Promise<void> {
    await this.http.post(`/entities/${encodeURIComponent(dictionaryId)}/`, entries, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getDictionaryEntry(dictionaryId: string, entryId: string): Promise<DictionaryEntry> {
    let response = await this.http.get(
      `/entities/${encodeURIComponent(dictionaryId)}/${encodeURIComponent(entryId)}`
    );
    return this.unwrap(response.data);
  }

  async deleteDictionaryEntry(dictionaryId: string, entryId: string): Promise<void> {
    await this.http.delete(
      `/entities/${encodeURIComponent(dictionaryId)}/${encodeURIComponent(entryId)}`
    );
  }

  // Classifier management
  async createClassifier(
    classifierId: string,
    categories: ClassifierCategory[]
  ): Promise<void> {
    await this.http.put(`/categories/${encodeURIComponent(classifierId)}`, categories, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async deleteClassifier(classifierId: string): Promise<void> {
    await this.http.delete(`/categories/${encodeURIComponent(classifierId)}`);
  }

  async listClassifierCategories(
    classifierId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ categories: ClassifierCategory[]; total: number }> {
    let response = await this.http.get(
      `/categories/${encodeURIComponent(classifierId)}/_all`,
      {
        params: { limit, offset }
      }
    );
    let result = this.unwrap<{ categories?: ClassifierCategory[]; total?: number }>(
      response.data
    );
    return {
      categories: result.categories ?? [],
      total: result.total ?? 0
    };
  }

  async getClassifierCategory(
    classifierId: string,
    categoryId: string
  ): Promise<ClassifierCategory> {
    let response = await this.http.get(
      `/categories/${encodeURIComponent(classifierId)}/${encodeURIComponent(categoryId)}`
    );
    return this.unwrap(response.data);
  }

  async deleteClassifierCategory(classifierId: string, categoryId: string): Promise<void> {
    await this.http.delete(
      `/categories/${encodeURIComponent(classifierId)}/${encodeURIComponent(categoryId)}`
    );
  }
}
