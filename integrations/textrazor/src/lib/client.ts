import { createAxios } from 'slates';

let createApiClient = (token: string) => {
  return createAxios({
    baseURL: 'https://api.textrazor.com',
    headers: {
      'X-TextRazor-Key': token
    }
  });
};

export interface AnalyzeTextParams {
  text?: string;
  url?: string;
  extractors: string[];
  languageOverride?: string;
  cleanupMode?: 'raw' | 'stripTags' | 'cleanHTML';
  cleanupReturnCleaned?: boolean;
  cleanupReturnRaw?: boolean;
  cleanupUseMetadata?: boolean;
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
      parentPosition?: number;
      relationToParent?: string;
      senses?: Array<{ synset: string; score: number }>;
      spellingSuggestions?: Array<{ suggestion: string; score: number }>;
    }>;
  }>;
  entities?: Array<{
    entityId?: string;
    entityEnglishId?: string;
    customEntityId?: string;
    confidenceScore?: number;
    relevanceScore?: number;
    type?: string[];
    freebaseTypes?: string[];
    freebaseId?: string;
    wikidataId?: string;
    wikiLink?: string;
    matchingTokens?: number[];
    matchedText?: string;
    data?: Record<string, string[]>;
  }>;
  topics?: Array<{
    label: string;
    score: number;
    wikiLink?: string;
    wikidataId?: string;
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
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async analyzeText(params: AnalyzeTextParams): Promise<AnalyzeTextResponse> {
    let http = createApiClient(this.token);

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
      for (let classifier of params.classifiers) {
        formData.append('classifiers', classifier);
      }
    }
    if (params.rules) {
      formData.append('rules', params.rules);
    }

    let response = await http.post('/', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let data = response.data;
    let result: AnalyzeTextResponse = {
      time: data.time,
      ok: data.response?.ok ?? false,
      error: data.response?.error,
      message: data.response?.message,
      language: data.response?.language,
      languageIsReliable: data.response?.languageIsReliable,
      cleanedText: data.response?.cleanedText,
      rawText: data.response?.rawText,
      sentences: data.response?.sentences,
      entities: data.response?.entities,
      topics: data.response?.topics,
      categories: data.response?.categories,
      relations: data.response?.relations,
      entailments: data.response?.entailments,
      nounPhrases: data.response?.nounPhrases,
      properties: data.response?.properties,
      customAnnotationOutput: data.response?.customAnnotationOutput,
      matchingRules: data.response?.matchingRules
    };

    if (!result.ok && result.error) {
      throw new Error(
        `TextRazor analysis failed: ${result.error}${result.message ? ` - ${result.message}` : ''}`
      );
    }

    return result;
  }

  async getAccount(): Promise<AccountInfo> {
    let http = createApiClient(this.token);
    let response = await http.get('/account/');
    return response.data;
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
    let http = createApiClient(this.token);
    await http.put(`/entities/${encodeURIComponent(dictionaryId)}`, options ?? {}, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async listDictionaries(): Promise<DictionaryInfo[]> {
    let http = createApiClient(this.token);
    let response = await http.get('/entities/');
    return response.data.dictionaries ?? [];
  }

  async getDictionary(dictionaryId: string): Promise<DictionaryInfo> {
    let http = createApiClient(this.token);
    let response = await http.get(`/entities/${encodeURIComponent(dictionaryId)}`);
    return response.data;
  }

  async deleteDictionary(dictionaryId: string): Promise<void> {
    let http = createApiClient(this.token);
    await http.delete(`/entities/${encodeURIComponent(dictionaryId)}`);
  }

  // Dictionary entry management
  async listDictionaryEntries(
    dictionaryId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ entries: DictionaryEntry[]; total: number }> {
    let http = createApiClient(this.token);
    let response = await http.get(`/entities/${encodeURIComponent(dictionaryId)}/_all`, {
      params: { limit, offset }
    });
    return {
      entries: response.data.entries ?? [],
      total: response.data.total ?? 0
    };
  }

  async addDictionaryEntries(dictionaryId: string, entries: DictionaryEntry[]): Promise<void> {
    let http = createApiClient(this.token);
    await http.post(`/entities/${encodeURIComponent(dictionaryId)}/`, entries, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getDictionaryEntry(dictionaryId: string, entryId: string): Promise<DictionaryEntry> {
    let http = createApiClient(this.token);
    let response = await http.get(
      `/entities/${encodeURIComponent(dictionaryId)}/${encodeURIComponent(entryId)}`
    );
    return response.data;
  }

  async deleteDictionaryEntry(dictionaryId: string, entryId: string): Promise<void> {
    let http = createApiClient(this.token);
    await http.delete(
      `/entities/${encodeURIComponent(dictionaryId)}/${encodeURIComponent(entryId)}`
    );
  }

  // Classifier management
  async createClassifier(
    classifierId: string,
    categories: ClassifierCategory[]
  ): Promise<void> {
    let http = createApiClient(this.token);
    await http.put(`/categories/${encodeURIComponent(classifierId)}`, categories, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async deleteClassifier(classifierId: string): Promise<void> {
    let http = createApiClient(this.token);
    await http.delete(`/categories/${encodeURIComponent(classifierId)}`);
  }

  async listClassifierCategories(
    classifierId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ categories: ClassifierCategory[]; total: number }> {
    let http = createApiClient(this.token);
    let response = await http.get(`/categories/${encodeURIComponent(classifierId)}/_all`, {
      params: { limit, offset }
    });
    return {
      categories: response.data.categories ?? [],
      total: response.data.total ?? 0
    };
  }

  async getClassifierCategory(
    classifierId: string,
    categoryId: string
  ): Promise<ClassifierCategory> {
    let http = createApiClient(this.token);
    let response = await http.get(
      `/categories/${encodeURIComponent(classifierId)}/${encodeURIComponent(categoryId)}`
    );
    return response.data;
  }

  async deleteClassifierCategory(classifierId: string, categoryId: string): Promise<void> {
    let http = createApiClient(this.token);
    await http.delete(
      `/categories/${encodeURIComponent(classifierId)}/${encodeURIComponent(categoryId)}`
    );
  }
}
