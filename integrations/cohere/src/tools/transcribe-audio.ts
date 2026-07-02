import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

export let transcribeAudioTool = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe speech from an uploaded audio file using Cohere Transcribe. Supports the current Cohere audio transcription endpoint for automatic speech recognition.`,
  constraints: ['Audio files must be no larger than Cohere Transcribe model limits.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .default('cohere-transcribe-03-2026')
        .describe('Cohere transcription model to use'),
      language: z
        .string()
        .length(2)
        .describe('Input audio language in ISO-639-1 format, such as "en"'),
      filename: z.string().describe('Audio file name, including extension'),
      fileContent: z.string().optional().describe('Audio file content as a text string'),
      fileContentBase64: z.string().optional().describe('Base64-encoded audio file bytes'),
      mimeType: z.string().optional().describe('Audio MIME type, such as audio/wav'),
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
      text: z.string().describe('Transcribed text'),
      rawResult: z.any().optional().describe('Full Cohere transcription response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });
    let result = await client.transcribeAudio({
      model: ctx.input.model,
      language: ctx.input.language,
      filename: ctx.input.filename,
      fileContent: ctx.input.fileContent,
      fileContentBase64: ctx.input.fileContentBase64,
      mimeType: ctx.input.mimeType,
      temperature: ctx.input.temperature
    });

    return {
      output: {
        text: result.text || '',
        rawResult: result
      },
      message: `Transcribed audio file **${ctx.input.filename}**.`
    };
  })
  .build();
