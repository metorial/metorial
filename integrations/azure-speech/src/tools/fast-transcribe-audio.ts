import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { azureSpeechServiceError } from '../lib/errors';
import { spec } from '../spec';

let wordSchema = z.object({
  text: z.string().describe('Recognized word text'),
  offsetMilliseconds: z.number().optional().describe('Word start offset in milliseconds'),
  durationMilliseconds: z.number().optional().describe('Word duration in milliseconds')
});

let phraseSchema = z.object({
  channel: z
    .number()
    .optional()
    .describe('Audio channel index when channel separation is used'),
  speaker: z.number().optional().describe('Speaker label when diarization is enabled'),
  offsetMilliseconds: z.number().optional().describe('Phrase start offset in milliseconds'),
  durationMilliseconds: z.number().optional().describe('Phrase duration in milliseconds'),
  text: z.string().describe('Recognized phrase text'),
  locale: z.string().optional().describe('Detected or configured phrase locale'),
  confidence: z.number().optional().describe('Recognition confidence from 0.0 to 1.0'),
  words: z.array(wordSchema).optional().describe('Word-level timings when returned')
});

export let fastTranscribeAudio = SlateTool.create(spec, {
  name: 'Fast Transcribe Audio',
  key: 'fast_transcribe_audio',
  description: `Synchronously transcribes one audio file with Azure Speech fast transcription. Use this for quick file transcription with predictable latency when the audio is too large for short-audio recognition or when phrase/channel/diarization detail is needed.`,
  instructions: [
    'Provide one base64-encoded audio file. Azure supports common formats such as WAV, MP3, FLAC, and OGG for fast transcription.',
    'Set locales when the expected language is known. Omit locales to let Azure use multilingual detection.',
    'Enable diarization only for single-channel audio. Do not request channels [0, 1] with diarization.'
  ],
  constraints: [
    'The audio file must be shorter than 2 hours and smaller than 250 MB.',
    'Fast transcription is synchronous and may still take time for longer audio.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio file content'),
      fileName: z
        .string()
        .optional()
        .describe('Original file name, including extension. Defaults to audio.wav.'),
      contentType: z
        .string()
        .optional()
        .describe('Audio MIME type, such as audio/wav or audio/mpeg. Defaults to audio/wav.'),
      locales: z
        .array(z.string())
        .optional()
        .describe(
          'Optional candidate locales. Use one known locale for accuracy or multiple locales for language identification.'
        ),
      channels: z
        .array(z.number())
        .optional()
        .describe('Optional zero-based channels to transcribe separately, such as [0, 1]'),
      diarizationEnabled: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization for single-channel audio'),
      diarizationMaxSpeakers: z
        .number()
        .optional()
        .describe('Maximum expected speakers for diarization (2-35)'),
      profanityFilterMode: z
        .enum(['None', 'Masked', 'Removed', 'Tags'])
        .optional()
        .describe('How Azure should handle profanity in transcription results')
    })
  )
  .output(
    z.object({
      transcript: z.string().describe('Combined transcript text across channels'),
      durationMilliseconds: z
        .number()
        .optional()
        .describe('Audio duration in milliseconds when returned'),
      combinedPhrases: z
        .array(
          z.object({
            channel: z.number().optional().describe('Audio channel index'),
            text: z.string().describe('Combined transcript text for this channel')
          })
        )
        .describe('Full transcript phrases, separated by channel when applicable'),
      phrases: z.array(phraseSchema).describe('Detailed phrase-level transcription results')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.locales?.length === 0) {
      throw azureSpeechServiceError('locales must contain at least one locale when provided.');
    }

    if (ctx.input.channels && ctx.input.channels.length > 2) {
      throw azureSpeechServiceError('Fast transcription supports at most two channels.');
    }

    if (
      ctx.input.diarizationMaxSpeakers !== undefined &&
      (ctx.input.diarizationMaxSpeakers < 2 || ctx.input.diarizationMaxSpeakers > 35)
    ) {
      throw azureSpeechServiceError('diarizationMaxSpeakers must be between 2 and 35.');
    }

    if (
      (ctx.input.diarizationEnabled || ctx.input.diarizationMaxSpeakers !== undefined) &&
      ctx.input.channels?.length === 2
    ) {
      throw azureSpeechServiceError(
        'diarization cannot be combined with channel separation for channels [0, 1].'
      );
    }

    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info('Running fast transcription...');

    let result = await client.fastTranscribeAudio({
      audioBase64: ctx.input.audioBase64,
      fileName: ctx.input.fileName,
      contentType: ctx.input.contentType,
      locales: ctx.input.locales,
      channels: ctx.input.channels,
      diarization:
        ctx.input.diarizationEnabled !== undefined ||
        ctx.input.diarizationMaxSpeakers !== undefined
          ? {
              enabled: ctx.input.diarizationEnabled ?? true,
              maxSpeakers: ctx.input.diarizationMaxSpeakers
            }
          : undefined,
      profanityFilterMode: ctx.input.profanityFilterMode
    });

    let combinedPhrases: Array<{ channel?: number; text: string }> = (
      result.combinedPhrases ?? []
    ).map((phrase: any) => ({
      channel: phrase.channel,
      text: phrase.text ?? ''
    }));

    let phrases: Array<{
      channel?: number;
      speaker?: number;
      offsetMilliseconds?: number;
      durationMilliseconds?: number;
      text: string;
      locale?: string;
      confidence?: number;
      words?: Array<{
        text: string;
        offsetMilliseconds?: number;
        durationMilliseconds?: number;
      }>;
    }> = (result.phrases ?? []).map((phrase: any) => ({
      channel: phrase.channel,
      speaker: phrase.speaker,
      offsetMilliseconds: phrase.offsetMilliseconds,
      durationMilliseconds: phrase.durationMilliseconds,
      text: phrase.text ?? '',
      locale: phrase.locale,
      confidence: phrase.confidence,
      words: Array.isArray(phrase.words)
        ? phrase.words.map((word: any) => ({
            text: word.text ?? '',
            offsetMilliseconds: word.offsetMilliseconds,
            durationMilliseconds: word.durationMilliseconds
          }))
        : undefined
    }));

    let transcript =
      combinedPhrases
        .map((phrase: { text: string }) => phrase.text)
        .filter(Boolean)
        .join('\n') ||
      phrases
        .map((phrase: { text: string }) => phrase.text)
        .filter(Boolean)
        .join(' ');

    return {
      output: {
        transcript,
        durationMilliseconds: result.durationMilliseconds,
        combinedPhrases,
        phrases
      },
      message: transcript
        ? `Fast transcription completed: "${transcript.slice(0, 160)}${transcript.length > 160 ? '...' : ''}"`
        : 'Fast transcription completed without transcript text.'
    };
  })
  .build();
