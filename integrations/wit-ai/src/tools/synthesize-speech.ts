import { createApiServiceError, getResponseHeaderValue, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let synthesizeSpeech = SlateTool.create(spec, {
  name: 'Synthesize Speech',
  key: 'synthesize_speech',
  description:
    'Convert text to a downloadable audio file using a Wit.ai voice. Call list_voices to choose a supported voice and style.',
  tags: { destructive: false }
})
  .input(
    z.object({
      text: z.string().min(1).describe('Text to speak'),
      voice: z.string().min(1).describe('Voice name from list_voices'),
      style: z
        .string()
        .optional()
        .describe('Style supported by the chosen voice; defaults to default'),
      speed: z
        .number()
        .positive()
        .optional()
        .describe('Speech speed percentage; defaults to 100'),
      pitch: z
        .number()
        .positive()
        .optional()
        .describe('Voice pitch percentage; defaults to 100'),
      gain: z.number().positive().optional().describe('Audio gain percentage; defaults to 100')
    })
  )
  .output(
    z.object({
      voice: z.string().describe('Voice used for synthesis'),
      mimeType: z.string().describe('Audio file MIME type'),
      filename: z.string().describe('Audio file name'),
      size: z.number().describe('Audio size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let response = await client.synthesize({
      q: ctx.input.text,
      voice: ctx.input.voice,
      style: ctx.input.style ?? 'default',
      speed: ctx.input.speed ?? 100,
      pitch: ctx.input.pitch ?? 100,
      gain: ctx.input.gain ?? 100
    });
    let mimeType =
      getResponseHeaderValue(response.headers, 'content-type') ?? 'application/octet-stream';
    let bytes = new Uint8Array(response.data);
    if (
      !bytes.length ||
      (!mimeType.startsWith('audio/') && !mimeType.startsWith('application/octet-stream'))
    ) {
      throw createApiServiceError('Wit.ai did not return an audio file for synthesis.');
    }
    let extension = mimeType.includes('mpeg')
      ? 'mp3'
      : mimeType.includes('wav')
        ? 'wav'
        : 'pcm';
    let filename = `speech.${extension}`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(bytes, { headers: { 'content-type': mimeType } }),
      mimeType,
      filename
    });
    return {
      output: { voice: ctx.input.voice, mimeType, filename, size: bytes.length },
      message: 'The synthesized speech is ready to download.'
    };
  })
  .build();
