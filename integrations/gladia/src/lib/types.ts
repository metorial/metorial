export interface UploadResponse {
  audio_url: string;
  audio_metadata: {
    id: string;
    filename: string;
    extension: string;
    size: number;
    audio_duration: number;
    number_of_channels: number;
  };
}

export interface TranscriptionInitResponse {
  id: string;
  result_url: string;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionUtterance {
  text: string;
  language: string;
  start: number;
  end: number;
  confidence: number;
  channel: number;
  speaker?: number;
  words: TranscriptionWord[];
}

export interface TranscriptionSentence {
  text: string;
  language: string;
  start: number;
  end: number;
  confidence: number;
  channel: number;
  speaker?: number;
  words: TranscriptionWord[];
}

export interface SubtitleEntry {
  format: string;
  subtitles: string;
}

export interface TranscriptionResult {
  metadata: {
    audio_duration: number;
    number_of_distinct_channels: number;
    billing_time: number;
    transcription_time: number;
    number_of_channels?: number;
  };
  transcription?: {
    full_transcript: string;
    languages: string[];
    utterances: TranscriptionUtterance[];
    sentences?: AudioIntelligenceResult[];
    subtitles?: SubtitleEntry[];
  };
  translation?: AudioIntelligenceResult;
  summarization?: AudioIntelligenceResult;
  moderation?: AudioIntelligenceResult;
  named_entity_recognition?: AudioIntelligenceResult;
  sentiment_analysis?: AudioIntelligenceResult;
  chapterization?: AudioIntelligenceResult;
  audio_to_llm?: AudioIntelligenceResult;
  structured_data_extraction?: AudioIntelligenceResult;
  name_consistency?: AudioIntelligenceResult;
  sentences?: unknown;
}

export interface AudioIntelligenceResult {
  success: boolean;
  is_empty: boolean;
  results: unknown;
  exec_time: number;
  error: unknown;
}

export interface TranscriptionResponse {
  id: string;
  request_id: string;
  version: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  kind: string;
  created_at: string;
  completed_at?: string | null;
  custom_metadata?: Record<string, unknown>;
  error_code?: number | null;
  file?: {
    id: string;
    filename: string;
    source: string;
    audio_duration: number;
    number_of_channels: number;
  } | null;
  request_params?: Record<string, unknown> | null;
  result?: TranscriptionResult | null;
}

export interface LiveSessionInitResponse {
  id: string;
  created_at: string;
  url: string;
}

export interface TranscriptionRequestParams {
  audio_url: string;
  language_config?: {
    languages?: string[];
    code_switching?: boolean;
  };
  diarization?: boolean;
  diarization_config?: {
    number_of_speakers?: number;
    min_speakers?: number;
    max_speakers?: number;
  };
  translation?: boolean;
  translation_config?: {
    target_languages?: string[];
    model?: 'base' | 'batch' | 'enhanced';
  };
  summarization?: boolean;
  summarization_config?: {
    type?: 'general' | 'concise' | 'bullet_points';
  };
  sentiment_analysis?: boolean;
  named_entity_recognition?: boolean;
  audio_to_llm?: boolean;
  audio_to_llm_config?: {
    prompts?: string[];
  };
  subtitles?: boolean;
  subtitles_config?: {
    formats?: string[];
  };
  custom_vocabulary?: boolean;
  custom_vocabulary_config?: {
    vocabulary?: (
      | string
      | { value: string; intensity?: number; pronunciations?: string[]; language?: string }
    )[];
    default_intensity?: number;
  };
  custom_spelling?: boolean;
  custom_spelling_config?: {
    spelling_dictionary: Record<string, string[]>;
  };
  sentences?: boolean;
  callback?: boolean;
  callback_config?: { url: string; method?: 'POST' | 'PUT' };
  model?: 'solaria-1' | 'solaria-3' | 'solaria-fusion';
  custom_metadata?: Record<string, unknown>;
}

export interface LiveSessionRequestParams {
  encoding?: 'wav/pcm' | 'wav/alaw' | 'wav/ulaw';
  sample_rate?: number;
  bit_depth?: number;
  channels?: number;
  endpointing?: number;
  maximum_duration_without_endpointing?: number;
  region?: string;
  language_config?: {
    languages?: string[];
    code_switching?: boolean;
  };
  pre_processing?: {
    audio_enhancer?: boolean;
    speech_threshold?: number;
  };
  realtime_processing?: {
    custom_vocabulary?: boolean;
    custom_vocabulary_config?: {
      vocabulary?: (
        | string
        | { value: string; intensity?: number; pronunciations?: string[]; language?: string }
      )[];
      default_intensity?: number;
    };
    translation?: boolean;
    translation_config?: {
      target_languages?: string[];
      model?: 'base' | 'batch' | 'enhanced';
    };
    named_entity_recognition?: boolean;
    sentiment_analysis?: boolean;
  };
  post_processing?: {
    summarization?: boolean;
    summarization_config?: {
      type?: 'general' | 'concise' | 'bullet_points';
    };
  };
  messages_config?: {
    receive_partial_transcripts?: boolean;
  };
  callback_config?: {
    url?: string;
  };
  callback?: boolean;
  custom_metadata?: Record<string, unknown>;
}

export interface ListTranscriptionsParams {
  kind?: 'pre-recorded' | 'live';
  offset?: number;
  limit?: number;
  date?: string;
  before_date?: string;
  after_date?: string;
  status?: TranscriptionResponse['status'][];
}

export interface ListTranscriptionsResponse {
  first: string;
  current: string;
  next: string | null;
  items: TranscriptionResponse[];
}
