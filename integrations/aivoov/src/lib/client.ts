import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

let voiceSchema = z.object({
  voice_id: z.string().min(1),
  name: z.string().min(1),
  language: z.string().min(1)
});

let generatedAudioSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  audio: z.string().min(1)
});

let transcriptionStatusSchema = z.enum(['QUEUED', 'IN_PROGRESS', 'FAILED', 'COMPLETED']);

let createdTranscriptionSchema = z.object({
  job_id: z.string().min(1),
  status: transcriptionStatusSchema,
  result: z.literal(true),
  characters_used: z.number().nonnegative()
});

let transcriptionSchema = z.object({
  status: transcriptionStatusSchema,
  text: z.string().optional(),
  srt: z.string().optional(),
  FailureReason: z.string().optional()
});

export interface TextSegment {
  voiceId: string;
  text: string;
  pitch?: number;
  speakingRate?: number;
  volume?: number;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(credentials: { token: string }) {
    if (!credentials.token.trim()) {
      throw createApiServiceError(
        'An AiVOOV API key is required. Reconnect with your API key.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://aivoov.com/api/v8',
      authHeader: { name: 'X-API-KEY', value: credentials.token },
      contentType: false,
      timeout: 120000,
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'AiVOOV', reason: 'aivoov_api_error' })
    });
  }

  private assertSuccess(data: unknown, operation: string) {
    if (isApiErrorRecord(data) && (data.status === false || data.result === false)) {
      throw createApiServiceError(
        `AiVOOV ${operation} failed: ${extractApiErrorMessage({ response: { data } }, { fallbackMessage: 'The provider rejected the request.' })}`
      );
    }
  }

  async getVoices(languageCode?: string) {
    let params: Record<string, string> = {};
    if (languageCode !== undefined) {
      if (!languageCode.trim()) {
        throw createApiServiceError('languageCode must not be empty when provided.');
      }
      params.language_code = languageCode;
    }

    let response = await this.http.get<unknown>('/voices', { params });
    this.assertSuccess(response.data, 'voice retrieval');
    let voices = z.array(voiceSchema).safeParse(response.data);
    if (!voices.success) {
      throw createApiServiceError(
        'AiVOOV returned an invalid voice catalog. Expected every voice to include voice_id, name, and language.'
      );
    }
    return voices.data.map(v => ({
      voiceId: v.voice_id,
      name: v.name,
      language: v.language
    }));
  }

  async createAudio(segments: TextSegment[]) {
    if (segments.length === 0) {
      throw createApiServiceError('Provide at least one text segment.');
    }
    let formParams = new URLSearchParams();

    for (let [index, segment] of segments.entries()) {
      if (!segment.voiceId.trim() || !segment.text.trim()) {
        throw createApiServiceError(
          `Segment ${index + 1} requires a voiceId and non-empty text.`
        );
      }
      for (let [field, value, min, max] of [
        ['pitch', segment.pitch, -50, 50],
        ['speakingRate', segment.speakingRate, 20, 200],
        ['volume', segment.volume, -40, 40]
      ] as const) {
        if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
          throw createApiServiceError(
            `Segment ${index + 1} ${field} must be an integer between ${min} and ${max}.`
          );
        }
      }
      formParams.append('voice_id[]', segment.voiceId);
      formParams.append('transcribe_text[]', segment.text);
      formParams.append(
        'transcribe_ssml_pitch_rate[]',
        segment.pitch !== undefined ? String(segment.pitch) : 'default'
      );
      formParams.append(
        'transcribe_ssml_spk_rate[]',
        segment.speakingRate !== undefined ? String(segment.speakingRate) : 'default'
      );
      formParams.append(
        'transcribe_ssml_volume[]',
        segment.volume !== undefined ? String(segment.volume) : 'default'
      );
    }

    let response = await this.http.post<unknown>('/create', formParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.assertSuccess(response.data, 'audio generation');
    let result = generatedAudioSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'AiVOOV returned an invalid audio response. Expected status, message, and generated audio.'
      );
    }
    return result.data;
  }

  async createTranscription(file: Blob, filename: string, language: string) {
    let form = new FormData();
    form.append('file', file, filename);
    form.append('language', language);
    let response = await this.http.post<unknown>('/speech', form);
    this.assertSuccess(response.data, 'transcription creation');
    let result = createdTranscriptionSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'AiVOOV returned an invalid transcription response. Expected job_id, status, result, and characters_used.'
      );
    }
    if (result.data.status === 'FAILED') {
      throw createApiServiceError('AiVOOV failed to create the transcription job.');
    }
    return result.data;
  }

  async getTranscription(jobId: string) {
    let response = await this.http.get<unknown>('/job', { params: { job_id: jobId } });
    this.assertSuccess(response.data, 'transcription retrieval');
    let result = transcriptionSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('AiVOOV returned an invalid transcription job status.');
    }
    if (result.data.status === 'FAILED') {
      throw createApiServiceError(
        `AiVOOV transcription failed${result.data.FailureReason ? `: ${result.data.FailureReason}` : '.'}`
      );
    }
    if (
      result.data.status === 'COMPLETED' &&
      (result.data.text === undefined || result.data.srt === undefined)
    ) {
      throw createApiServiceError(
        'AiVOOV reported a completed transcription without the transcript and SRT subtitles.'
      );
    }
    return result.data;
  }
}
