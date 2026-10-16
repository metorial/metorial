import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { decodeAudio } from '../lib/audio';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTranscription = SlateTool.create(spec, {
  name: 'Create Transcription',
  key: 'create_transcription',
  description:
    'Submit an MP3, WAV, FLAC, or OGG audio file for speech recognition. Returns a job ID; call get_transcription to check progress and download the completed transcript and subtitles.',
  constraints: [
    'Audio files must be no larger than 10 MB.',
    'The speech endpoint allows 30 requests per minute and 1,000 requests per day.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      fileBase64: z
        .string()
        .describe('Base64-encoded audio file content without a data URL prefix.'),
      filename: z.string().describe('Audio filename ending in .mp3, .wav, .flac, or .ogg.'),
      language: z
        .string()
        .describe('Language/locale spoken in the audio, such as en-US or fr-FR.')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID to pass to get_transcription.'),
      status: z.string().describe('Provider processing status.'),
      charactersUsed: z.number().describe('Character usage reported by AiVOOV.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.filename.trim() || /[/\\\r\n]/.test(ctx.input.filename)) {
      throw createApiServiceError(
        'Provide an audio filename without path separators or line breaks.'
      );
    }
    if (!ctx.input.language.trim()) {
      throw createApiServiceError('Provide the language/locale spoken in the audio.');
    }
    if (getBase64ByteLength(ctx.input.fileBase64) > 10_000_000) {
      throw createApiServiceError('The audio file must be no larger than 10 MB.');
    }
    let content = decodeAudio(ctx.input.fileBase64, 'fileBase64');
    let extension = ctx.input.filename.split('.').pop()?.toLowerCase();
    let mimeType =
      extension === 'mp3'
        ? 'audio/mpeg'
        : extension === 'wav'
          ? 'audio/wav'
          : extension === 'flac'
            ? 'audio/flac'
            : extension === 'ogg'
              ? 'audio/ogg'
              : undefined;
    if (!mimeType) {
      throw createApiServiceError(
        'Provide an audio filename ending in .mp3, .wav, .flac, or .ogg.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTranscription(
      new Blob([new Uint8Array(content)], { type: mimeType }),
      ctx.input.filename,
      ctx.input.language
    );
    return {
      output: {
        jobId: result.job_id,
        status: result.status,
        charactersUsed: result.characters_used
      },
      message: `Submitted transcription job **${result.job_id}**. Call get_transcription to check its progress.`
    };
  })
  .build();
