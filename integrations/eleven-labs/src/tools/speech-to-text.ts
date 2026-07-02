import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { elevenLabsServiceError } from '../lib/errors';
import { spec } from '../spec';

let wordSchema = z.object({
  text: z.string().optional().describe('The transcribed word'),
  start: z.number().optional().describe('Start time in seconds'),
  end: z.number().optional().describe('End time in seconds'),
  type: z.string().optional().describe('Type of word segment'),
  speaker_id: z.string().optional().describe('Speaker identifier when diarization is enabled')
});

export let speechToText = SlateTool.create(spec, {
  name: 'Speech to Text',
  key: 'speech_to_text',
  description: `Transcribe audio into text with high accuracy. Supports speaker diarization, word-level timestamps, and 99+ languages. Provide audio as a base64-encoded file or a publicly accessible source URL.`,
  instructions: [
    'Set sourceType to "file" with fileBase64, or "url" with sourceUrl. cloudStorageUrl remains available only for deprecated provider compatibility.',
    'Enable "diarize" to identify different speakers in the audio.'
  ],
  constraints: [
    'File uploads are limited to 3GB. Cloud storage URLs are limited to 2GB.',
    'Maximum 32 speakers for diarization.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .enum(['scribe_v1', 'scribe_v2'])
        .default('scribe_v2')
        .describe('Transcription model to use'),
      sourceType: z
        .enum(['file', 'url'])
        .default('file')
        .describe(
          'Audio source type. For "file", provide fileBase64. For "url", provide sourceUrl.'
        ),
      fileBase64: z
        .string()
        .optional()
        .describe('Base64-encoded audio/video file to transcribe'),
      fileName: z
        .string()
        .optional()
        .describe('Original filename (helps with format detection)'),
      cloudStorageUrl: z
        .string()
        .optional()
        .describe('Deprecated HTTPS URL field. Prefer sourceUrl for URL transcription.'),
      sourceUrl: z
        .string()
        .optional()
        .describe(
          'URL of an audio or video file to transcribe. Supports hosted files and video URLs.'
        ),
      languageCode: z
        .string()
        .optional()
        .describe('ISO 639-1/639-3 language code. Auto-detected if not provided.'),
      diarize: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization to identify different speakers'),
      numSpeakers: z
        .number()
        .optional()
        .describe('Expected number of speakers (0 for auto-detection, max 32)'),
      timestampsGranularity: z
        .enum(['none', 'word', 'character'])
        .optional()
        .describe('Level of timestamp detail in the output'),
      tagAudioEvents: z
        .boolean()
        .optional()
        .describe('Tag non-speech audio events like music and laughter'),
      diarizationThreshold: z
        .number()
        .min(0.1)
        .max(0.4)
        .optional()
        .describe(
          'Speaker diarization threshold. Only valid with diarize=true and no numSpeakers.'
        ),
      fileFormat: z
        .enum(['pcm_s16le_16', 'other'])
        .optional()
        .describe('Input format. Use pcm_s16le_16 for raw 16-bit 16kHz mono PCM.'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Transcription randomness, from 0.0 to 2.0'),
      seed: z
        .number()
        .int()
        .min(0)
        .max(2147483647)
        .optional()
        .describe('Best-effort deterministic transcription seed'),
      useMultiChannel: z
        .boolean()
        .optional()
        .describe(
          'Transcribe each audio channel independently when input has multiple channels'
        )
    })
  )
  .output(
    z.object({
      text: z.string().optional().describe('Full transcribed text'),
      languageCode: z.string().optional().describe('Detected or specified language code'),
      languageProbability: z.number().optional().describe('Confidence of language detection'),
      words: z
        .array(wordSchema)
        .optional()
        .describe('Word-level transcription with timestamps'),
      transcriptionId: z.string().optional().describe('Unique ID for this transcription')
    })
  )
  .handleInvocation(async ctx => {
    let hasFile = Boolean(ctx.input.fileBase64);
    let hasUrl = Boolean(ctx.input.sourceUrl || ctx.input.cloudStorageUrl);

    if (ctx.input.sourceType === 'file' && (!hasFile || hasUrl)) {
      throw elevenLabsServiceError(
        'For sourceType "file", provide fileBase64 and do not provide sourceUrl or cloudStorageUrl.'
      );
    }

    if (ctx.input.sourceType === 'url' && (!hasUrl || hasFile)) {
      throw elevenLabsServiceError(
        'For sourceType "url", provide exactly one of sourceUrl or cloudStorageUrl and do not provide fileBase64.'
      );
    }

    if (ctx.input.sourceUrl && ctx.input.cloudStorageUrl) {
      throw elevenLabsServiceError('Provide only one of sourceUrl or cloudStorageUrl.');
    }

    if (
      ctx.input.diarizationThreshold !== undefined &&
      (!ctx.input.diarize || ctx.input.numSpeakers !== undefined)
    ) {
      throw elevenLabsServiceError(
        'diarizationThreshold can only be used when diarize is true and numSpeakers is omitted.'
      );
    }

    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.speechToText({
      modelId: ctx.input.modelId,
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName,
      sourceUrl: ctx.input.sourceUrl,
      cloudStorageUrl: ctx.input.cloudStorageUrl,
      languageCode: ctx.input.languageCode,
      diarize: ctx.input.diarize,
      numSpeakers: ctx.input.numSpeakers,
      timestampsGranularity: ctx.input.timestampsGranularity,
      tagAudioEvents: ctx.input.tagAudioEvents,
      diarizationThreshold: ctx.input.diarizationThreshold,
      fileFormat: ctx.input.fileFormat,
      temperature: ctx.input.temperature,
      seed: ctx.input.seed,
      useMultiChannel: ctx.input.useMultiChannel
    });

    let data = result as Record<string, unknown>;

    let textPreview =
      typeof data.text === 'string'
        ? data.text.length > 100
          ? `${data.text.slice(0, 100)}...`
          : data.text
        : 'No text returned';

    return {
      output: {
        text: data.text as string | undefined,
        languageCode: data.language_code as string | undefined,
        languageProbability: data.language_probability as number | undefined,
        words: data.words as Record<string, unknown>[] | undefined,
        transcriptionId: data.transcription_id as string | undefined
      },
      message: `Transcribed audio (${ctx.input.modelId}): "${textPreview}"`
    };
  })
  .build();
