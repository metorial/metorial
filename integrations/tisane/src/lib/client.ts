import { createAxios } from 'slates';

export interface ParseSettings {
  abuse?: boolean;
  sentiment?: boolean;
  documentSentiment?: boolean;
  entities?: boolean;
  topics?: boolean;
  topicStats?: boolean;
  optimizeTopics?: boolean;
  words?: boolean;
  fetchDefinitions?: boolean;
  parses?: boolean;
  deterministic?: boolean;
  snippets?: boolean;
  explain?: boolean;
  format?: string;
  disableSpellcheck?: boolean;
  lowercaseSpellcheckOnly?: boolean;
  minGenericFrequency?: number;
  subscope?: boolean;
  domainFactors?: Record<string, number>;
  when?: string;
  disablePhrases?: boolean;
  featureStandard?: string;
  topicStandard?: string;
  sentimentAnalysisType?: string;
}

export interface AbuseItem {
  sentenceIndex: number;
  offset: number;
  length: number;
  text?: string;
  type: string;
  severity: string;
  tags?: string[];
  explanation?: string;
}

export interface SentimentExpression {
  sentenceIndex: number;
  offset: number;
  length: number;
  text?: string;
  polarity: string;
  targets?: string[];
  reasons?: string[];
  explanation?: string;
}

export interface EntitySummary {
  name: string;
  refLemma?: string;
  type: string | string[];
  subtype?: string;
  mentions: Array<{
    sentenceIndex: number;
    offset: number;
    length: number;
    text?: string;
  }>;
  familyId?: number;
}

export interface ParseResponse {
  text: string;
  language?: string;
  reducedOutput?: boolean;
  sentiment?: number;
  signal2noise?: number;
  topics?: Array<string | { topic: string; coverage: number }>;
  abuse?: AbuseItem[];
  entitiesSummary?: EntitySummary[];
  sentimentExpressions?: SentimentExpression[];
  sentenceList?: any[];
}

export interface DetectLanguageResponse {
  [key: string]: any;
}

export interface CompareEntitiesResponse {
  result: string;
  differences?: string[];
}

export interface LanguageInfo {
  id: string;
  name: string;
  englishName: string;
  nativeEncoding?: string;
  preferredFont?: string;
  latin?: boolean;
  rightToLeft?: boolean;
}

let toApiSettings = (settings: ParseSettings): Record<string, any> => {
  let result: Record<string, any> = {};
  if (settings.abuse !== undefined) result.abuse = settings.abuse;
  if (settings.sentiment !== undefined) result.sentiment = settings.sentiment;
  if (settings.documentSentiment !== undefined)
    result.document_sentiment = settings.documentSentiment;
  if (settings.entities !== undefined) result.entities = settings.entities;
  if (settings.topics !== undefined) result.topics = settings.topics;
  if (settings.topicStats !== undefined) result.topic_stats = settings.topicStats;
  if (settings.optimizeTopics !== undefined) result.optimize_topics = settings.optimizeTopics;
  if (settings.words !== undefined) result.words = settings.words;
  if (settings.fetchDefinitions !== undefined)
    result.fetch_definitions = settings.fetchDefinitions;
  if (settings.parses !== undefined) result.parses = settings.parses;
  if (settings.deterministic !== undefined) result.deterministic = settings.deterministic;
  if (settings.snippets !== undefined) result.snippets = settings.snippets;
  if (settings.explain !== undefined) result.explain = settings.explain;
  if (settings.format !== undefined) result.format = settings.format;
  if (settings.disableSpellcheck !== undefined)
    result.disable_spellcheck = settings.disableSpellcheck;
  if (settings.lowercaseSpellcheckOnly !== undefined)
    result.lowercase_spellcheck_only = settings.lowercaseSpellcheckOnly;
  if (settings.minGenericFrequency !== undefined)
    result.min_generic_frequency = settings.minGenericFrequency;
  if (settings.subscope !== undefined) result.subscope = settings.subscope;
  if (settings.domainFactors !== undefined) result.domain_factors = settings.domainFactors;
  if (settings.when !== undefined) result.when = settings.when;
  if (settings.disablePhrases !== undefined) result.disable_phrases = settings.disablePhrases;
  if (settings.featureStandard !== undefined)
    result.feature_standard = settings.featureStandard;
  if (settings.topicStandard !== undefined) result.topic_standard = settings.topicStandard;
  if (settings.sentimentAnalysisType !== undefined)
    result.sentiment_analysis_type = settings.sentimentAnalysisType;
  return result;
};

let mapAbuseItem = (item: any): AbuseItem => ({
  sentenceIndex: item.sentence_index,
  offset: item.offset,
  length: item.length,
  text: item.text,
  type: item.type,
  severity: item.severity,
  tags: item.tags,
  explanation: item.explanation
});

let mapSentimentExpression = (item: any): SentimentExpression => ({
  sentenceIndex: item.sentence_index,
  offset: item.offset,
  length: item.length,
  text: item.text,
  polarity: item.polarity,
  targets: item.targets,
  reasons: item.reasons,
  explanation: item.explanation
});

let mapEntity = (item: any): EntitySummary => ({
  name: item.name,
  refLemma: item.ref_lemma,
  type: item.type,
  subtype: item.subtype,
  mentions: (item.mentions || []).map((m: any) => ({
    sentenceIndex: m.sentence_index,
    offset: m.offset,
    length: m.length,
    text: m.text
  })),
  familyId: item.family_id
});

let mapParseResponse = (data: any): ParseResponse => ({
  text: data.text,
  language: data.language,
  reducedOutput: data.reduced_output,
  sentiment: data.sentiment,
  signal2noise: data.signal2noise,
  topics: data.topics,
  abuse: data.abuse?.map(mapAbuseItem),
  entitiesSummary: data.entities_summary?.map(mapEntity),
  sentimentExpressions: data.sentiment_expressions?.map(mapSentimentExpression),
  sentenceList: data.sentence_list
});

export class Client {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.tisane.ai',
      headers: {
        'Ocp-Apim-Subscription-Key': token
      }
    });
  }

  async parse(
    language: string,
    content: string,
    settings: ParseSettings = {}
  ): Promise<ParseResponse> {
    let response = await this.http.post('/parse', {
      language,
      content,
      settings: toApiSettings(settings)
    });
    return mapParseResponse(response.data);
  }

  async detectLanguage(content: string, languages?: string, delimiter?: string): Promise<any> {
    let body: Record<string, any> = { content };
    if (languages) body.languages = languages;
    if (delimiter) body.delimiter = delimiter;
    let response = await this.http.post('/detectLanguage', body);
    return response.data;
  }

  async similarity(
    language1: string,
    content1: string,
    language2: string,
    content2: string,
    settings?: ParseSettings
  ): Promise<number> {
    let body: Record<string, any> = {
      language1,
      content1,
      language2,
      content2
    };
    if (settings) body.settings = toApiSettings(settings);
    let response = await this.http.post('/similarity', body);
    return response.data;
  }

  async compareEntities(
    language1: string,
    entity1: string,
    language2: string,
    entity2: string,
    type: string = 'person'
  ): Promise<CompareEntitiesResponse> {
    let response = await this.http.post('/compare/entities', {
      language1,
      entity1,
      language2,
      entity2,
      type
    });
    return response.data;
  }

  async translate(
    from: string,
    to: string,
    content: string,
    settings: Record<string, any> = {}
  ): Promise<string> {
    let response = await this.http.post('/transform', {
      from,
      to,
      content,
      settings
    });
    return response.data;
  }

  async cleanUpText(content: string): Promise<string> {
    let response = await this.http.post('/helper/extract_text', content, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    return response.data;
  }

  async listLanguages(): Promise<LanguageInfo[]> {
    let response = await this.http.get('/languages');
    return response.data;
  }

  async lookupSenses(language: string, word: string): Promise<any[]> {
    let response = await this.http.get('/lm/senses', {
      params: { language, word }
    });
    return response.data;
  }

  async getFamily(family: number): Promise<any> {
    let response = await this.http.get('/lm/families', {
      params: { family }
    });
    return response.data;
  }

  async getHypernyms(family: number, maxLevel?: number): Promise<any> {
    let params: Record<string, any> = { family };
    if (maxLevel !== undefined) params.maxLevel = maxLevel;
    let response = await this.http.get('/lm/hypernyms', { params });
    return response.data;
  }

  async getHyponyms(family: number): Promise<any> {
    let response = await this.http.get('/lm/hyponyms', {
      params: { family }
    });
    return response.data;
  }

  async getInflections(language: string, lexeme?: number, family?: number): Promise<any[]> {
    let params: Record<string, any> = { language };
    if (lexeme !== undefined) params.lexeme = lexeme;
    if (family !== undefined) params.family = family;
    let response = await this.http.get('/lm/inflections', { params });
    return response.data;
  }

  async getFeatures(): Promise<any> {
    let response = await this.http.get('/lm/features');
    return response.data;
  }
}
