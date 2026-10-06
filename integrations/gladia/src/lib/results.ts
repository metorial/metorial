import { isApiErrorRecord } from 'slates';
import { z } from 'zod';
import type { TranscriptionResponse, TranscriptionResult } from './types';

export let utteranceSchema = z.object({
  text: z.string(),
  language: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  channel: z.number(),
  speaker: z.number().optional()
});

export let subtitleFileSchema = z.object({
  filename: z.string(),
  format: z.string(),
  language: z.string().optional()
});

export let transcriptionOutputSchema = z.object({
  transcriptionId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  audioDuration: z.number().optional(),
  numberOfChannels: z.number().optional(),
  fullTranscript: z.string().optional(),
  languages: z.array(z.string()).optional(),
  utterances: z.array(utteranceSchema).optional(),
  translation: z.unknown().optional(),
  summarization: z.unknown().optional(),
  sentimentAnalysis: z.unknown().optional(),
  namedEntityRecognition: z.unknown().optional(),
  chapterization: z.unknown().optional(),
  audioToLlm: z.unknown().optional(),
  moderation: z.unknown().optional(),
  structuredDataExtraction: z.unknown().optional(),
  nameConsistency: z.unknown().optional(),
  sentences: z.unknown().optional(),
  // Retained for the existing output contract. Subtitle files are delivered separately.
  subtitles: z.array(z.object({ format: z.string(), subtitles: z.string() })).optional(),
  subtitleFiles: z.array(subtitleFileSchema).optional(),
  errorCode: z.number().nullable().optional()
});

type AddFile = (file: {
  type: 'content';
  content: Response;
  filename: string;
  mimeType: string;
}) => Promise<unknown>;

export let prepareTranscriptionFiles = async (
  response: TranscriptionResponse,
  addFile: AddFile
) => {
  let files: z.infer<typeof subtitleFileSchema>[] = [];
  let attachSubtitles = async (subtitles: unknown, language?: string) => {
    if (!Array.isArray(subtitles)) return;
    for (let subtitle of subtitles) {
      if (!isApiErrorRecord(subtitle) || typeof subtitle.subtitles !== 'string') continue;
      if (subtitle.format !== 'srt' && subtitle.format !== 'vtt') continue;
      let safeLanguage = language?.replace(/[^a-zA-Z0-9-]/g, '') || undefined;
      let filename = `transcription-${response.id}${safeLanguage ? `-${safeLanguage}` : ''}.${subtitle.format}`;
      let mimeType = subtitle.format === 'vtt' ? 'text/vtt' : 'application/x-subrip';
      await addFile({
        type: 'content',
        content: new Response(subtitle.subtitles, { headers: { 'content-type': mimeType } }),
        filename,
        mimeType
      });
      files.push({ filename, format: subtitle.format, language: safeLanguage });
    }
  };

  let result = response.result;
  if (!result) return { result, subtitleFiles: undefined };
  await attachSubtitles(result.transcription?.subtitles);
  let translation = result.translation;
  if (translation && Array.isArray(translation.results)) {
    let translations: unknown[] = [];
    for (let item of translation.results) {
      if (!isApiErrorRecord(item)) {
        translations.push(item);
        continue;
      }
      let language =
        Array.isArray(item.languages) && typeof item.languages[0] === 'string'
          ? item.languages[0]
          : undefined;
      await attachSubtitles(item.subtitles, language);
      translations.push({ ...item, subtitles: undefined });
    }
    translation = { ...translation, results: translations };
  }
  let cleanResult: TranscriptionResult = {
    ...result,
    translation,
    transcription: result.transcription
      ? { ...result.transcription, subtitles: undefined }
      : undefined
  };
  return { result: cleanResult, subtitleFiles: files.length ? files : undefined };
};

export let mapTranscription = (response: TranscriptionResponse) => {
  let result = response.result;
  return {
    transcriptionId: response.id,
    status: response.status,
    createdAt: response.created_at,
    completedAt: response.completed_at ?? null,
    errorCode: response.error_code,
    audioDuration: result?.metadata?.audio_duration,
    numberOfChannels:
      result?.metadata?.number_of_distinct_channels ?? result?.metadata?.number_of_channels,
    fullTranscript: result?.transcription?.full_transcript,
    languages: result?.transcription?.languages,
    utterances: result?.transcription?.utterances?.map(
      ({ words: _words, ...utterance }) => utterance
    ),
    translation: result?.translation,
    summarization: result?.summarization,
    sentimentAnalysis: result?.sentiment_analysis,
    namedEntityRecognition: result?.named_entity_recognition,
    chapterization: result?.chapterization,
    audioToLlm: result?.audio_to_llm,
    moderation: result?.moderation,
    structuredDataExtraction: result?.structured_data_extraction,
    nameConsistency: result?.name_consistency,
    sentences: result?.transcription?.sentences ?? result?.sentences
  };
};
