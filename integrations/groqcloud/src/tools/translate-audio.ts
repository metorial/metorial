import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateAudio = SlateTool.create(spec, {
  name: 'Translate Audio',
  key: 'translate_audio',
  description: `Translate spoken audio into English text using Groq's Whisper models. Accepts audio in any supported language and produces an English translation. Provide an audio file URL and receive the translated text.`,
  instructions: [
    'Provide the audio file URL. Supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.',
    'The output is always translated to English regardless of the source language.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audioUrl: z.string().describe('URL of the audio file to translate'),
      model: z
        .enum(['whisper-large-v3', 'whisper-large-v3-turbo'])
        .default('whisper-large-v3-turbo')
        .describe('Whisper model to use'),
      prompt: z
        .string()
        .optional()
        .describe('Optional English text to guide the translation style'),
      responseFormat: z
        .enum(['json', 'text', 'verbose_json'])
        .optional()
        .describe('Response format'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Sampling temperature between 0 and 1')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Translated text in English')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.translateAudio({
      fileUrl: ctx.input.audioUrl,
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      responseFormat: ctx.input.responseFormat,
      temperature: ctx.input.temperature
    });

    return {
      output: {
        text: result.text
      },
      message: `Translated audio to English using **${ctx.input.model}**. Output length: ${result.text.length} characters.`
    };
  })
  .build();
