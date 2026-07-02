import { createAxios } from 'slates';

// ---- Shared Types ----

export interface RevAIJob {
  jobId: string;
  status: string;
  createdOn: string;
  completedOn?: string;
  name?: string;
  mediaUrl?: string;
  metadata?: string;
  language?: string;
  durationSeconds?: number;
  type?: string;
  failure?: string;
  failureDetail?: string;
  deleteAfterSeconds?: number;
  skipDiarization?: boolean;
  skipPunctuation?: boolean;
  filterProfanity?: boolean;
  removeDisfluencies?: boolean;
  removeAtmospherics?: boolean;
  speakerChannelsCount?: number;
  transcriber?: string;
  verbatim?: boolean;
  wordCloud?: boolean;
}

export interface TranscriptMonologue {
  speaker: number;
  elements: TranscriptElement[];
}

export interface TranscriptElement {
  type: string;
  value: string;
  ts?: number;
  endTs?: number;
  confidence?: number;
}

export interface SentimentMessage {
  content: string;
  score: number;
  sentiment: string;
  ts?: number;
  endTs?: number;
}

export interface Topic {
  topicName: string;
  score: number;
  informants: Array<{
    content: string;
    ts?: number;
    endTs?: number;
  }>;
}

export interface LanguageIdResult {
  topLanguage: string;
  languageConfidences: Array<{
    language: string;
    confidence: number;
  }>;
}

export interface CustomVocabulary {
  vocabularyId: string;
  status: string;
  createdOn?: string;
  completedOn?: string;
  metadata?: string;
  failure?: string;
  failureDetail?: string;
}

export interface AccountInfo {
  email: string;
  balanceSeconds: number;
}

// ---- Client ----

export class RevAIClient {
  private sttAxios: ReturnType<typeof createAxios>;
  private sentimentAxios: ReturnType<typeof createAxios>;
  private topicAxios: ReturnType<typeof createAxios>;
  private langIdAxios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    let headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };

    this.sttAxios = createAxios({
      baseURL: 'https://api.rev.ai/speechtotext/v1',
      headers
    });

    this.sentimentAxios = createAxios({
      baseURL: 'https://api.rev.ai/sentiment_analysis/v1',
      headers
    });

    this.topicAxios = createAxios({
      baseURL: 'https://api.rev.ai/topic_extraction/v1',
      headers
    });

    this.langIdAxios = createAxios({
      baseURL: 'https://api.rev.ai/languageid/v1',
      headers
    });
  }

  // ---- Account ----

  async getAccount(): Promise<AccountInfo> {
    let response = await this.sttAxios.get('/account');
    return {
      email: response.data.email,
      balanceSeconds: response.data.balance_seconds
    };
  }

  // ---- Transcription Jobs ----

  async submitTranscriptionJob(params: {
    mediaUrl?: string;
    metadata?: string;
    language?: string;
    skipDiarization?: boolean;
    skipPunctuation?: boolean;
    filterProfanity?: boolean;
    removeDisfluencies?: boolean;
    removeAtmospherics?: boolean;
    speakerChannelsCount?: number;
    customVocabularyId?: string;
    customVocabularies?: Array<{ phrases: string[] }>;
    notificationConfig?: { url: string; authHeaders?: Record<string, string> };
    translationConfig?: { targetLanguages: string[] };
    summarizationConfig?: { type?: string; model?: string; prompt?: string };
    deleteAfterSeconds?: number;
    transcriber?: string;
    verbatim?: boolean;
    skipPostprocessing?: boolean;
    diarizationConfig?: { type?: string; speakerCount?: number };
  }): Promise<RevAIJob> {
    let body: Record<string, unknown> = {};

    if (params.mediaUrl !== undefined) body.media_url = params.mediaUrl;
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.language !== undefined) body.language = params.language;
    if (params.skipDiarization !== undefined) body.skip_diarization = params.skipDiarization;
    if (params.skipPunctuation !== undefined) body.skip_punctuation = params.skipPunctuation;
    if (params.filterProfanity !== undefined) body.filter_profanity = params.filterProfanity;
    if (params.removeDisfluencies !== undefined)
      body.remove_disfluencies = params.removeDisfluencies;
    if (params.removeAtmospherics !== undefined)
      body.remove_atmospherics = params.removeAtmospherics;
    if (params.speakerChannelsCount !== undefined)
      body.speaker_channels_count = params.speakerChannelsCount;
    if (params.customVocabularyId !== undefined)
      body.custom_vocabulary_id = params.customVocabularyId;
    if (params.customVocabularies !== undefined)
      body.custom_vocabularies = params.customVocabularies;
    if (params.deleteAfterSeconds !== undefined)
      body.delete_after_seconds = params.deleteAfterSeconds;
    if (params.transcriber !== undefined) body.transcriber = params.transcriber;
    if (params.verbatim !== undefined) body.verbatim = params.verbatim;
    if (params.skipPostprocessing !== undefined)
      body.skip_postprocessing = params.skipPostprocessing;

    if (params.notificationConfig) {
      let nc: Record<string, unknown> = { url: params.notificationConfig.url };
      if (params.notificationConfig.authHeaders)
        nc.auth_headers = params.notificationConfig.authHeaders;
      body.notification_config = nc;
    }

    if (params.translationConfig) {
      body.translation_config = {
        target_languages: params.translationConfig.targetLanguages
      };
    }

    if (params.summarizationConfig) {
      let sc: Record<string, unknown> = {};
      if (params.summarizationConfig.type) sc.type = params.summarizationConfig.type;
      if (params.summarizationConfig.model) sc.model = params.summarizationConfig.model;
      if (params.summarizationConfig.prompt) sc.prompt = params.summarizationConfig.prompt;
      body.summarization_config = sc;
    }

    if (params.diarizationConfig) {
      let dc: Record<string, unknown> = {};
      if (params.diarizationConfig.type) dc.type = params.diarizationConfig.type;
      if (params.diarizationConfig.speakerCount)
        dc.speaker_count = params.diarizationConfig.speakerCount;
      body.diarization_config = dc;
    }

    let response = await this.sttAxios.post('/jobs', body);
    return this.normalizeJob(response.data);
  }

  async getTranscriptionJob(jobId: string): Promise<RevAIJob> {
    let response = await this.sttAxios.get(`/jobs/${jobId}`);
    return this.normalizeJob(response.data);
  }

  async listTranscriptionJobs(params?: {
    limit?: number;
    startingAfter?: string;
  }): Promise<RevAIJob[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.startingAfter !== undefined) queryParams.starting_after = params.startingAfter;

    let response = await this.sttAxios.get('/jobs', { params: queryParams });
    return (response.data as Record<string, unknown>[]).map(j => this.normalizeJob(j));
  }

  async deleteTranscriptionJob(jobId: string): Promise<void> {
    await this.sttAxios.delete(`/jobs/${jobId}`);
  }

  async getTranscriptJson(jobId: string): Promise<{ monologues: TranscriptMonologue[] }> {
    let response = await this.sttAxios.get(`/jobs/${jobId}/transcript`, {
      headers: { Accept: 'application/vnd.rev.transcript.v1.0+json' }
    });
    let monologues = (response.data.monologues || []).map((m: Record<string, unknown>) => ({
      speaker: m.speaker as number,
      elements: ((m.elements || []) as Record<string, unknown>[]).map(e => ({
        type: e.type as string,
        value: e.value as string,
        ts: e.ts as number | undefined,
        endTs: e.end_ts as number | undefined,
        confidence: e.confidence as number | undefined
      }))
    }));
    return { monologues };
  }

  async getTranscriptText(jobId: string): Promise<string> {
    let response = await this.sttAxios.get(`/jobs/${jobId}/transcript`, {
      headers: { Accept: 'text/plain' }
    });
    return response.data as string;
  }

  async getTranslatedTranscriptText(jobId: string, language: string): Promise<string> {
    let response = await this.sttAxios.get(
      `/jobs/${jobId}/transcript/translation/${language}`,
      {
        headers: { Accept: 'text/plain' }
      }
    );
    return response.data as string;
  }

  async getTranscriptSummary(jobId: string): Promise<string> {
    let response = await this.sttAxios.get(`/jobs/${jobId}/transcript/summary`, {
      headers: { Accept: 'text/plain' }
    });
    return response.data as string;
  }

  async getCaptions(
    jobId: string,
    format: 'srt' | 'vtt',
    speakerChannel?: number
  ): Promise<string> {
    let accept = format === 'srt' ? 'application/x-subrip' : 'text/vtt';
    let queryParams: Record<string, string> = {};
    if (speakerChannel !== undefined) queryParams.speaker_channel = String(speakerChannel);

    let response = await this.sttAxios.get(`/jobs/${jobId}/captions`, {
      headers: { Accept: accept },
      params: queryParams
    });
    return response.data as string;
  }

  // ---- Custom Vocabulary ----

  async submitCustomVocabulary(params: {
    customVocabularies: Array<{ phrases: string[] }>;
    metadata?: string;
    notificationConfig?: { url: string; authHeaders?: Record<string, string> };
  }): Promise<CustomVocabulary> {
    let body: Record<string, unknown> = {
      custom_vocabularies: params.customVocabularies
    };
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.notificationConfig) {
      let nc: Record<string, unknown> = { url: params.notificationConfig.url };
      if (params.notificationConfig.authHeaders)
        nc.auth_headers = params.notificationConfig.authHeaders;
      body.notification_config = nc;
    }

    let response = await this.sttAxios.post('/vocabularies', body);
    return this.normalizeVocabulary(response.data);
  }

  async getCustomVocabulary(vocabularyId: string): Promise<CustomVocabulary> {
    let response = await this.sttAxios.get(`/vocabularies/${vocabularyId}`);
    return this.normalizeVocabulary(response.data);
  }

  async listCustomVocabularies(params?: { limit?: number }): Promise<CustomVocabulary[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.sttAxios.get('/vocabularies', { params: queryParams });
    return (response.data as Record<string, unknown>[]).map(v => this.normalizeVocabulary(v));
  }

  async deleteCustomVocabulary(vocabularyId: string): Promise<void> {
    await this.sttAxios.delete(`/vocabularies/${vocabularyId}`);
  }

  // ---- Sentiment Analysis ----

  async submitSentimentAnalysis(params: {
    text?: string;
    json?: unknown;
    metadata?: string;
    notificationConfig?: { url: string; authHeaders?: Record<string, string> };
    language?: string;
  }): Promise<RevAIJob> {
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.json !== undefined) body.json = params.json;
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.language !== undefined) body.language = params.language;
    if (params.notificationConfig) {
      let nc: Record<string, unknown> = { url: params.notificationConfig.url };
      if (params.notificationConfig.authHeaders)
        nc.auth_headers = params.notificationConfig.authHeaders;
      body.notification_config = nc;
    }

    let response = await this.sentimentAxios.post('/jobs', body);
    return this.normalizeJob(response.data);
  }

  async getSentimentAnalysisJob(jobId: string): Promise<RevAIJob> {
    let response = await this.sentimentAxios.get(`/jobs/${jobId}`);
    return this.normalizeJob(response.data);
  }

  async getSentimentAnalysisResult(jobId: string): Promise<{ messages: SentimentMessage[] }> {
    let response = await this.sentimentAxios.get(`/jobs/${jobId}/result`, {
      headers: { Accept: 'application/vnd.rev.sentiment.v1.0+json' }
    });
    let messages = ((response.data.messages || []) as Record<string, unknown>[]).map(m => ({
      content: m.content as string,
      score: m.score as number,
      sentiment: m.sentiment as string,
      ts: m.ts as number | undefined,
      endTs: m.end_ts as number | undefined
    }));
    return { messages };
  }

  async listSentimentAnalysisJobs(params?: {
    limit?: number;
    startingAfter?: string;
  }): Promise<RevAIJob[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.startingAfter !== undefined) queryParams.starting_after = params.startingAfter;

    let response = await this.sentimentAxios.get('/jobs', { params: queryParams });
    return (response.data as Record<string, unknown>[]).map(j => this.normalizeJob(j));
  }

  async deleteSentimentAnalysisJob(jobId: string): Promise<void> {
    await this.sentimentAxios.delete(`/jobs/${jobId}`);
  }

  // ---- Topic Extraction ----

  async submitTopicExtraction(params: {
    text?: string;
    json?: unknown;
    metadata?: string;
    notificationConfig?: { url: string; authHeaders?: Record<string, string> };
    language?: string;
  }): Promise<RevAIJob> {
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.json !== undefined) body.json = params.json;
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.language !== undefined) body.language = params.language;
    if (params.notificationConfig) {
      let nc: Record<string, unknown> = { url: params.notificationConfig.url };
      if (params.notificationConfig.authHeaders)
        nc.auth_headers = params.notificationConfig.authHeaders;
      body.notification_config = nc;
    }

    let response = await this.topicAxios.post('/jobs', body);
    return this.normalizeJob(response.data);
  }

  async getTopicExtractionJob(jobId: string): Promise<RevAIJob> {
    let response = await this.topicAxios.get(`/jobs/${jobId}`);
    return this.normalizeJob(response.data);
  }

  async getTopicExtractionResult(
    jobId: string,
    threshold?: number
  ): Promise<{ topics: Topic[] }> {
    let queryParams: Record<string, string> = {};
    if (threshold !== undefined) queryParams.threshold = String(threshold);

    let response = await this.topicAxios.get(`/jobs/${jobId}/result`, {
      headers: { Accept: 'application/vnd.rev.topic.v1.0+json' },
      params: queryParams
    });
    let topics = ((response.data.topics || []) as Record<string, unknown>[]).map(t => ({
      topicName: t.topic_name as string,
      score: t.score as number,
      informants: ((t.informants || []) as Record<string, unknown>[]).map(inf => ({
        content: inf.content as string,
        ts: inf.ts as number | undefined,
        endTs: inf.end_ts as number | undefined
      }))
    }));
    return { topics };
  }

  async listTopicExtractionJobs(params?: {
    limit?: number;
    startingAfter?: string;
  }): Promise<RevAIJob[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.startingAfter !== undefined) queryParams.starting_after = params.startingAfter;

    let response = await this.topicAxios.get('/jobs', { params: queryParams });
    return (response.data as Record<string, unknown>[]).map(j => this.normalizeJob(j));
  }

  async deleteTopicExtractionJob(jobId: string): Promise<void> {
    await this.topicAxios.delete(`/jobs/${jobId}`);
  }

  // ---- Language Identification ----

  async submitLanguageIdentification(params: {
    mediaUrl?: string;
    sourceConfig?: { url: string; authHeaders?: Record<string, string> };
    metadata?: string;
    notificationConfig?: { url: string; authHeaders?: Record<string, string> };
    deleteAfterSeconds?: number;
  }): Promise<RevAIJob> {
    let body: Record<string, unknown> = {};
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.deleteAfterSeconds !== undefined)
      body.delete_after_seconds = params.deleteAfterSeconds;

    if (params.sourceConfig) {
      let sc: Record<string, unknown> = { url: params.sourceConfig.url };
      if (params.sourceConfig.authHeaders) sc.auth_headers = params.sourceConfig.authHeaders;
      body.source_config = sc;
    } else if (params.mediaUrl) {
      body.source_config = { url: params.mediaUrl };
    }

    if (params.notificationConfig) {
      let nc: Record<string, unknown> = { url: params.notificationConfig.url };
      if (params.notificationConfig.authHeaders)
        nc.auth_headers = params.notificationConfig.authHeaders;
      body.notification_config = nc;
    }

    let response = await this.langIdAxios.post('/jobs', body);
    return this.normalizeJob(response.data);
  }

  async getLanguageIdentificationJob(jobId: string): Promise<RevAIJob> {
    let response = await this.langIdAxios.get(`/jobs/${jobId}`);
    return this.normalizeJob(response.data);
  }

  async getLanguageIdentificationResult(jobId: string): Promise<LanguageIdResult> {
    let response = await this.langIdAxios.get(`/jobs/${jobId}/result`, {
      headers: { Accept: 'application/vnd.rev.languageid.v1.0+json' }
    });
    return {
      topLanguage: response.data.top_language as string,
      languageConfidences: (
        (response.data.language_confidences || []) as Record<string, unknown>[]
      ).map(lc => ({
        language: lc.language as string,
        confidence: lc.confidence as number
      }))
    };
  }

  async listLanguageIdentificationJobs(params?: {
    limit?: number;
    startingAfter?: string;
  }): Promise<RevAIJob[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.startingAfter !== undefined) queryParams.starting_after = params.startingAfter;

    let response = await this.langIdAxios.get('/jobs', { params: queryParams });
    return (response.data as Record<string, unknown>[]).map(j => this.normalizeJob(j));
  }

  async deleteLanguageIdentificationJob(jobId: string): Promise<void> {
    await this.langIdAxios.delete(`/jobs/${jobId}`);
  }

  // ---- Normalization Helpers ----

  private normalizeJob(data: Record<string, unknown>): RevAIJob {
    return {
      jobId: data.id as string,
      status: data.status as string,
      createdOn: data.created_on as string,
      completedOn: data.completed_on as string | undefined,
      name: data.name as string | undefined,
      mediaUrl: data.media_url as string | undefined,
      metadata: data.metadata as string | undefined,
      language: data.language as string | undefined,
      durationSeconds: data.duration_seconds as number | undefined,
      type: data.type as string | undefined,
      failure: data.failure as string | undefined,
      failureDetail: data.failure_detail as string | undefined,
      deleteAfterSeconds: data.delete_after_seconds as number | undefined,
      skipDiarization: data.skip_diarization as boolean | undefined,
      skipPunctuation: data.skip_punctuation as boolean | undefined,
      filterProfanity: data.filter_profanity as boolean | undefined,
      removeDisfluencies: data.remove_disfluencies as boolean | undefined,
      removeAtmospherics: data.remove_atmospherics as boolean | undefined,
      speakerChannelsCount: data.speaker_channels_count as number | undefined,
      transcriber: data.transcriber as string | undefined,
      verbatim: data.verbatim as boolean | undefined
    };
  }

  private normalizeVocabulary(data: Record<string, unknown>): CustomVocabulary {
    return {
      vocabularyId: data.id as string,
      status: data.status as string,
      createdOn: data.created_on as string | undefined,
      completedOn: data.completed_on as string | undefined,
      metadata: data.metadata as string | undefined,
      failure: data.failure as string | undefined,
      failureDetail: data.failure_detail as string | undefined
    };
  }
}
