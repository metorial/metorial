import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { deepgramServiceError } from '../lib/errors';
import { spec } from '../spec';

export let textToSpeechTool = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into natural-sounding speech audio using Deepgram's text-to-speech REST API. Returns generated audio as a Slate attachment and reports only metadata in the structured output.`,
  instructions: [
    'Specify a TTS model/voice when you need a particular voice or locale.',
    'Supported encodings include "linear16", "mulaw", "alaw", "mp3", "opus", "flac", and "aac".',
    'Use callbackUrl for asynchronous generation; callback requests return metadata without an audio attachment.'
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
          'TTS model/voice to use, for example "aura-2-thalia-en" or another Deepgram Aura model.'
        ),
      encoding: z
        .string()
        .optional()
        .describe(
          'Audio encoding format, for example "mp3", "linear16", "mulaw", "alaw", "opus", "flac", or "aac".'
        ),
      sampleRate: z
        .number()
        .optional()
        .describe('Audio sample rate in Hz, for example 8000, 16000, 24000, or 48000.'),
      bitRate: z.number().optional().describe('Audio bit rate for lossy encodings.'),
      container: z
        .string()
        .optional()
        .describe('Audio container format, for example "wav", "ogg", or "none".'),
      speed: z
        .number()
        .optional()
        .describe('Speech speed multiplier supported by Deepgram TTS.'),
      tag: z.string().optional().describe('Tag for tracking the request in usage reports.'),
      mipOptOut: z.boolean().optional().describe('Opt out of model improvement processing.'),
      callbackUrl: z
        .string()
        .optional()
        .describe('Optional callback URL for asynchronous TTS results.'),
      callbackMethod: z
        .enum(['POST', 'PUT'])
        .optional()
        .describe('HTTP method Deepgram should use for callback delivery.')
    })
  )
  .output(
    z.object({
      contentType: z
        .string()
        .describe('MIME type of the audio attachment or callback response.'),
      byteLength: z.number().describe('Size of generated audio in bytes.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.'),
      requestId: z.string().optional().describe('Unique request identifier.'),
      callbackSubmitted: z
        .boolean()
        .optional()
        .describe('True when Deepgram accepted an asynchronous callback request.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.callbackMethod && !ctx.input.callbackUrl) {
      throw deepgramServiceError('callbackMethod requires callbackUrl.');
    }

    let client = new DeepgramClient(ctx.auth.token);

    let result = await client.textToSpeech({
      text: ctx.input.text,
      model: ctx.input.model,
      encoding: ctx.input.encoding,
      sampleRate: ctx.input.sampleRate,
      bitRate: ctx.input.bitRate,
      container: ctx.input.container,
      speed: ctx.input.speed,
      tag: ctx.input.tag,
      mipOptOut: ctx.input.mipOptOut,
      callback: ctx.input.callbackUrl,
      callbackMethod: ctx.input.callbackMethod
    });

    let textPreview = ctx.input.text.substring(0, 100);
    if (ctx.input.text.length > 100) textPreview += '...';

    let attachment = result.audioBase64
      ? createBase64Attachment(result.audioBase64, result.contentType)
      : undefined;

    return {
      output: {
        contentType: result.contentType,
        byteLength: result.byteLength,
        attachmentCount: attachment ? 1 : 0,
        requestId: result.requestId,
        callbackSubmitted: result.callbackSubmitted
      },
      attachments: attachment ? [attachment] : [],
      message: result.callbackSubmitted
        ? `Submitted asynchronous Deepgram speech request for: "${textPreview}"`
        : `Generated speech audio for: "${textPreview}" (format: ${result.contentType})`
    };
  })
  .build();
