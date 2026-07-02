import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transcribeAudio = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe audio to text using Groq's Whisper models with near-instant speed. Supports multiple audio formats and languages. Provide an audio file URL and receive the transcribed text.`,
  instructions: [
    'Provide the audio file URL. Supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.',
    'Optionally specify a language hint (ISO-639-1 code) to improve accuracy.',
    'Use the prompt parameter to provide context or guide the transcription style.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audioUrl: z.string().describe('URL of the audio file to transcribe'),
      model: z
        .enum(['whisper-large-v3', 'whisper-large-v3-turbo'])
        .default('whisper-large-v3-turbo')
        .describe('Whisper model to use'),
      language: z
        .string()
        .optional()
        .describe('Language of the audio in ISO-639-1 format (e.g., "en", "fr", "es")'),
      prompt: z
        .string()
        .optional()
        .describe('Optional text to guide the transcription style or provide context'),
      responseFormat: z
        .enum(['json', 'text', 'verbose_json'])
        .optional()
        .describe('Response format. "verbose_json" includes timestamps'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Sampling temperature between 0 and 1'),
      timestampGranularities: z
        .array(z.enum(['word', 'segment']))
        .optional()
        .describe('Timestamp granularity levels (requires verbose_json format)')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Transcribed text from the audio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.transcribeAudio({
      fileUrl: ctx.input.audioUrl,
      model: ctx.input.model,
      language: ctx.input.language,
      prompt: ctx.input.prompt,
      responseFormat: ctx.input.responseFormat,
      temperature: ctx.input.temperature,
      timestampGranularities: ctx.input.timestampGranularities
    });

    return {
      output: {
        text: result.text
      },
      message: `Transcribed audio using **${ctx.input.model}**. Output length: ${result.text.length} characters.`
    };
  })
  .build();
