import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { assemblyAiApiError } from './errors';

let getBaseUrl = (region: string) => {
  if (region === 'eu') {
    return 'https://api.eu.assemblyai.com';
  }
  return 'https://api.assemblyai.com';
};

let getStreamingBaseUrl = (region: string) => {
  if (region === 'eu') {
    return 'https://streaming.eu.assemblyai.com';
  }
  return 'https://streaming.assemblyai.com';
};

let getLlmGatewayBaseUrl = (region: string) => {
  if (region === 'eu') {
    return 'https://llm-gateway.eu.assemblyai.com';
  }
  return 'https://llm-gateway.assemblyai.com';
};

export interface TranscribeParams {
  audioUrl: string;
  languageCode?: string;
  languageCodes?: string[];
  languageDetection?: boolean;
  languageConfidenceThreshold?: number;
  speechModel?: string;
  speechModels?: string[];
  punctuate?: boolean;
  formatText?: boolean;
  disfluencies?: boolean;
  filterProfanity?: boolean;
  speakerLabels?: boolean;
  speakersExpected?: number;
  multichannel?: boolean;
  webhookUrl?: string;
  webhookAuthHeaderName?: string;
  webhookAuthHeaderValue?: string;
  autoHighlights?: boolean;
  autoChapters?: boolean;
  entityDetection?: boolean;
  sentimentAnalysis?: boolean;
  contentSafety?: boolean;
  contentSafetyConfidence?: number;
  iabCategories?: boolean;
  keytermsPrompt?: string[];
  summarization?: boolean;
  summaryModel?: string;
  summaryType?: string;
  redactPii?: boolean;
  redactPiiAudio?: boolean;
  redactPiiAudioQuality?: string;
  redactPiiPolicies?: string[];
  redactPiiSub?: string;
  redactPiiReturnUnredacted?: boolean;
  redactStaticEntities?: Record<string, string[]>;
  customSpelling?: Array<{ from: string[]; to: string }>;
  audioStartFrom?: number;
  audioEndAt?: number;
  speechThreshold?: number;
  prompt?: string;
  temperature?: number;
  domain?: string;
  removeAudioTags?: string;
}

export interface ListTranscriptsParams {
  limit?: number;
  status?: string;
  createdOn?: string;
  beforeId?: string;
  afterId?: string;
  throttledOnly?: boolean;
}

export interface ChatCompletionParams {
  model: string;
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  transcriptId?: string;
  modelRegion?: 'global';
  maxTokens?: number;
  temperature?: number;
}

export interface SpeechUnderstandingSpeaker {
  name?: string;
  role?: string;
  description?: string;
  company?: string;
  title?: string;
}

export interface SpeechUnderstandingParams {
  transcriptId: string;
  targetLanguages?: string[];
  formal?: boolean;
  matchOriginalUtterance?: boolean;
  speakerType?: string;
  speakers?: SpeechUnderstandingSpeaker[];
  customFormatting?: {
    date?: string;
    phoneNumber?: string;
    email?: string;
  };
}

export class Client {
  private token: string;
  private region: string;

  constructor(config: { token: string; region: string }) {
    this.token = config.token;
    this.region = config.region;
  }

  private get axios() {
    return createAxios({
      baseURL: getBaseUrl(this.region),
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private get streamingAxios() {
    return createAxios({
      baseURL: getStreamingBaseUrl(this.region),
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private get llmGatewayAxios() {
    return createAxios({
      baseURL: getLlmGatewayBaseUrl(this.region),
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw assemblyAiApiError(error, operation);
    }
  }

  async uploadMediaFile(contentBase64: string): Promise<any> {
    return this.request('upload media file', () =>
      this.axios.post('/v2/upload', Buffer.from(contentBase64, 'base64'), {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      })
    );
  }

  async submitTranscription(params: TranscribeParams): Promise<any> {
    let body: Record<string, any> = {
      audio_url: params.audioUrl
    };

    if (params.languageCode !== undefined) body.language_code = params.languageCode;
    if (params.languageCodes !== undefined) body.language_codes = params.languageCodes;
    if (params.languageDetection !== undefined)
      body.language_detection = params.languageDetection;
    if (params.languageConfidenceThreshold !== undefined)
      body.language_confidence_threshold = params.languageConfidenceThreshold;
    if (params.speechModel !== undefined) body.speech_model = params.speechModel;
    if (params.speechModels !== undefined) body.speech_models = params.speechModels;
    if (params.punctuate !== undefined) body.punctuate = params.punctuate;
    if (params.formatText !== undefined) body.format_text = params.formatText;
    if (params.disfluencies !== undefined) body.disfluencies = params.disfluencies;
    if (params.filterProfanity !== undefined) body.filter_profanity = params.filterProfanity;
    if (params.speakerLabels !== undefined) body.speaker_labels = params.speakerLabels;
    if (params.speakersExpected !== undefined)
      body.speakers_expected = params.speakersExpected;
    if (params.multichannel !== undefined) body.multichannel = params.multichannel;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.webhookAuthHeaderName !== undefined)
      body.webhook_auth_header_name = params.webhookAuthHeaderName;
    if (params.webhookAuthHeaderValue !== undefined)
      body.webhook_auth_header_value = params.webhookAuthHeaderValue;
    if (params.autoHighlights !== undefined) body.auto_highlights = params.autoHighlights;
    if (params.autoChapters !== undefined) body.auto_chapters = params.autoChapters;
    if (params.entityDetection !== undefined) body.entity_detection = params.entityDetection;
    if (params.sentimentAnalysis !== undefined)
      body.sentiment_analysis = params.sentimentAnalysis;
    if (params.contentSafety !== undefined) body.content_safety = params.contentSafety;
    if (params.contentSafetyConfidence !== undefined)
      body.content_safety_confidence = params.contentSafetyConfidence;
    if (params.iabCategories !== undefined) body.iab_categories = params.iabCategories;
    if (params.keytermsPrompt !== undefined) body.keyterms_prompt = params.keytermsPrompt;
    if (params.summarization !== undefined) body.summarization = params.summarization;
    if (params.summaryModel !== undefined) body.summary_model = params.summaryModel;
    if (params.summaryType !== undefined) body.summary_type = params.summaryType;
    if (params.redactPii !== undefined) body.redact_pii = params.redactPii;
    if (params.redactPiiAudio !== undefined) body.redact_pii_audio = params.redactPiiAudio;
    if (params.redactPiiAudioQuality !== undefined)
      body.redact_pii_audio_quality = params.redactPiiAudioQuality;
    if (params.redactPiiPolicies !== undefined)
      body.redact_pii_policies = params.redactPiiPolicies;
    if (params.redactPiiSub !== undefined) body.redact_pii_sub = params.redactPiiSub;
    if (params.redactPiiReturnUnredacted !== undefined)
      body.redact_pii_return_unredacted = params.redactPiiReturnUnredacted;
    if (params.redactStaticEntities !== undefined)
      body.redact_static_entities = params.redactStaticEntities;
    if (params.customSpelling !== undefined) {
      body.custom_spelling = params.customSpelling.map(s => ({
        from: s.from,
        to: s.to
      }));
    }
    if (params.audioStartFrom !== undefined) body.audio_start_from = params.audioStartFrom;
    if (params.audioEndAt !== undefined) body.audio_end_at = params.audioEndAt;
    if (params.speechThreshold !== undefined) body.speech_threshold = params.speechThreshold;
    if (params.prompt !== undefined) body.prompt = params.prompt;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.domain !== undefined) body.domain = params.domain;
    if (params.removeAudioTags !== undefined) body.remove_audio_tags = params.removeAudioTags;

    return this.request('submit transcription', () => this.axios.post('/v2/transcript', body));
  }

  async getTranscript(transcriptId: string): Promise<any> {
    return this.request('get transcript', () =>
      this.axios.get(`/v2/transcript/${transcriptId}`)
    );
  }

  async listTranscripts(params?: ListTranscriptsParams): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.status !== undefined) queryParams.status = params.status;
    if (params?.createdOn !== undefined) queryParams.created_on = params.createdOn;
    if (params?.beforeId !== undefined) queryParams.before_id = params.beforeId;
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.throttledOnly !== undefined) queryParams.throttled_only = params.throttledOnly;

    return this.request('list transcripts', () =>
      this.axios.get('/v2/transcript', { params: queryParams })
    );
  }

  async deleteTranscript(transcriptId: string): Promise<any> {
    return this.request('delete transcript', () =>
      this.axios.delete(`/v2/transcript/${transcriptId}`)
    );
  }

  async getSentences(transcriptId: string): Promise<any> {
    return this.request('get transcript sentences', () =>
      this.axios.get(`/v2/transcript/${transcriptId}/sentences`)
    );
  }

  async getParagraphs(transcriptId: string): Promise<any> {
    return this.request('get transcript paragraphs', () =>
      this.axios.get(`/v2/transcript/${transcriptId}/paragraphs`)
    );
  }

  async getSubtitles(
    transcriptId: string,
    format: 'srt' | 'vtt',
    charsPerCaption?: number
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (charsPerCaption !== undefined) params.chars_per_caption = charsPerCaption;
    return this.request('get subtitles', () =>
      this.axios.get(`/v2/transcript/${transcriptId}/${format}`, {
        params
      })
    );
  }

  async wordSearch(transcriptId: string, words: string[]): Promise<any> {
    return this.request('word search', () =>
      this.axios.get(`/v2/transcript/${transcriptId}/word-search`, {
        params: { words: words.join(',') }
      })
    );
  }

  async getRedactedAudio(transcriptId: string): Promise<any> {
    return this.request('get redacted audio', () =>
      this.axios.get(`/v2/transcript/${transcriptId}/redacted-audio`)
    );
  }

  async createStreamingToken(
    expiresInSeconds: number,
    maxSessionDurationSeconds?: number
  ): Promise<any> {
    let params: Record<string, any> = {
      expires_in_seconds: expiresInSeconds
    };
    if (maxSessionDurationSeconds !== undefined) {
      params.max_session_duration_seconds = maxSessionDurationSeconds;
    }
    return this.request('create streaming token', () =>
      this.streamingAxios.get('/v3/token', { params })
    );
  }

  async createChatCompletion(params: ChatCompletionParams): Promise<any> {
    let body: Record<string, any> = {
      model: params.model
    };

    if (params.messages !== undefined) body.messages = params.messages;
    if (params.prompt !== undefined) body.prompt = params.prompt;
    if (params.transcriptId !== undefined) body.transcript_id = params.transcriptId;
    if (params.modelRegion !== undefined) body.model_region = params.modelRegion;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;

    return this.request('create chat completion', () =>
      this.llmGatewayAxios.post('/v1/chat/completions', body)
    );
  }

  async createSpeechUnderstanding(params: SpeechUnderstandingParams): Promise<any> {
    let request: Record<string, any> = {};

    if (params.targetLanguages !== undefined) {
      request.translation = {
        target_languages: params.targetLanguages
      };
      if (params.formal !== undefined) request.translation.formal = params.formal;
      if (params.matchOriginalUtterance !== undefined) {
        request.translation.match_original_utterance = params.matchOriginalUtterance;
      }
    }

    if (params.speakerType !== undefined || params.speakers !== undefined) {
      request.speaker_identification = {};
      if (params.speakerType !== undefined) {
        request.speaker_identification.speaker_type = params.speakerType;
      }
      if (params.speakers !== undefined) {
        request.speaker_identification.speakers = params.speakers;
      }
    }

    if (params.customFormatting !== undefined) {
      request.custom_formatting = {};
      if (params.customFormatting.date !== undefined) {
        request.custom_formatting.date = params.customFormatting.date;
      }
      if (params.customFormatting.phoneNumber !== undefined) {
        request.custom_formatting.phone_number = params.customFormatting.phoneNumber;
      }
      if (params.customFormatting.email !== undefined) {
        request.custom_formatting.email = params.customFormatting.email;
      }
    }

    return this.request('create speech understanding', () =>
      this.llmGatewayAxios.post('/v1/understanding', {
        transcript_id: params.transcriptId,
        speech_understanding: {
          request
        }
      })
    );
  }
}
