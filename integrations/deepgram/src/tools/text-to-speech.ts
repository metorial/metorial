import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

export let textToSpeechTool = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into natural-sounding speech audio. Returns base64-encoded audio data. Supports 40+ English voices with localized accents, configurable encoding formats, sample rates, and bit rates.`,
  instructions: [
    'The default model is "aura-2-en". Specify a different model for other voices or locales.',
    'Supported encodings include "linear16", "mulaw", "alaw", "mp3", "opus", "flac", "aac".',
    'The audio is returned as base64-encoded data along with its content type.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to convert to speech.'),
      model: z
        .string()
        .optional()
        .describe(
          'TTS model/voice to use (e.g., "aura-2-en", "aura-asteria-en", "aura-luna-en"). Defaults to the latest model.'
        ),
      encoding: z
        .string()
        .optional()
        .describe(
          'Audio encoding format (e.g., "mp3", "linear16", "mulaw", "alaw", "opus", "flac", "aac").'
        ),
      sampleRate: z
        .number()
        .optional()
        .describe('Audio sample rate in Hz (e.g., 8000, 16000, 24000, 48000).'),
      bitRate: z.number().optional().describe('Audio bit rate for lossy encodings.'),
      container: z
        .string()
        .optional()
        .describe('Audio container format (e.g., "wav", "ogg", "none").')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio data.'),
      contentType: z
        .string()
        .describe('MIME type of the audio (e.g., "audio/mpeg", "audio/wav").'),
      requestId: z.string().optional().describe('Unique request identifier.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);

    let result = await client.textToSpeech({
      text: ctx.input.text,
      model: ctx.input.model,
      encoding: ctx.input.encoding,
      sampleRate: ctx.input.sampleRate,
      bitRate: ctx.input.bitRate,
      container: ctx.input.container
    });

    let textPreview = ctx.input.text.substring(0, 100);
    if (ctx.input.text.length > 100) textPreview += '...';

    return {
      output: {
        audioBase64: result.audioBase64,
        contentType: result.contentType,
        requestId: result.requestId
      },
      message: `Generated speech audio for: "${textPreview}" (format: ${result.contentType})`
    };
  })
  .build();
