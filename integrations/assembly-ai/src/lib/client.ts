import { createAxios } from 'slates';

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

export interface TranscribeParams {
  audioUrl: string;
  languageCode?: string;
  languageCodes?: string[];
  languageDetection?: boolean;
  languageConfidenceThreshold?: number;
  speechModel?: string;
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
  summarization?: boolean;
  summaryModel?: string;
  summaryType?: string;
  redactPii?: boolean;
  redactPiiAudio?: boolean;
  redactPiiAudioQuality?: string;
  redactPiiPolicies?: string[];
  redactPiiSub?: string;
  customSpelling?: Array<{ from: string[]; to: string }>;
  audioStartFrom?: number;
  audioEndAt?: number;
  speechThreshold?: number;
  prompt?: string;
}

export interface ListTranscriptsParams {
  limit?: number;
  status?: string;
  createdOn?: string;
  beforeId?: string;
  afterId?: string;
  throttledOnly?: boolean;
}

export interface LemurTaskParams {
  transcriptIds?: string[];
  inputText?: string;
  prompt: string;
  finalModel?: string;
  maxOutputSize?: number;
  temperature?: number;
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

    let response = await this.axios.post('/v2/transcript', body);
    return response.data;
  }

  async getTranscript(transcriptId: string): Promise<any> {
    let response = await this.axios.get(`/v2/transcript/${transcriptId}`);
    return response.data;
  }

  async listTranscripts(params?: ListTranscriptsParams): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.status !== undefined) queryParams.status = params.status;
    if (params?.createdOn !== undefined) queryParams.created_on = params.createdOn;
    if (params?.beforeId !== undefined) queryParams.before_id = params.beforeId;
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.throttledOnly !== undefined) queryParams.throttled_only = params.throttledOnly;

    let response = await this.axios.get('/v2/transcript', { params: queryParams });
    return response.data;
  }

  async deleteTranscript(transcriptId: string): Promise<any> {
    let response = await this.axios.delete(`/v2/transcript/${transcriptId}`);
    return response.data;
  }

  async getSentences(transcriptId: string): Promise<any> {
    let response = await this.axios.get(`/v2/transcript/${transcriptId}/sentences`);
    return response.data;
  }

  async getParagraphs(transcriptId: string): Promise<any> {
    let response = await this.axios.get(`/v2/transcript/${transcriptId}/paragraphs`);
    return response.data;
  }

  async getSubtitles(
    transcriptId: string,
    format: 'srt' | 'vtt',
    charsPerCaption?: number
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (charsPerCaption !== undefined) params.chars_per_caption = charsPerCaption;
    let response = await this.axios.get(`/v2/transcript/${transcriptId}/${format}`, {
      params
    });
    return response.data;
  }

  async wordSearch(transcriptId: string, words: string[]): Promise<any> {
    let response = await this.axios.get(`/v2/transcript/${transcriptId}/word-search`, {
      params: { words: words.join(',') }
    });
    return response.data;
  }

  async getRedactedAudio(transcriptId: string): Promise<any> {
    let response = await this.axios.get(`/v2/transcript/${transcriptId}/redacted-audio`);
    return response.data;
  }

  async lemurTask(params: LemurTaskParams): Promise<any> {
    let body: Record<string, any> = {
      prompt: params.prompt
    };
    if (params.transcriptIds !== undefined) body.transcript_ids = params.transcriptIds;
    if (params.inputText !== undefined) body.input_text = params.inputText;
    if (params.finalModel !== undefined) body.final_model = params.finalModel;
    if (params.maxOutputSize !== undefined) body.max_output_size = params.maxOutputSize;
    if (params.temperature !== undefined) body.temperature = params.temperature;

    let response = await this.axios.post('/lemur/v3/generate/task', body);
    return response.data;
  }

  async lemurPurge(requestId: string): Promise<any> {
    let response = await this.axios.delete(`/lemur/v3/${requestId}`);
    return response.data;
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
    let response = await this.streamingAxios.get('/v3/token', { params });
    return response.data;
  }
}
