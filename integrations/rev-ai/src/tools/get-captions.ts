import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let getCaptions = SlateTool.create(spec, {
  name: 'Get Captions',
  key: 'get_captions',
  description: `Retrieves captions for a completed transcription job in SubRip (SRT) or Web Video Text Tracks (VTT) format. Useful for generating subtitle files from transcriptions.`,
  instructions: [
    'The transcription job must have status "transcribed" before fetching captions.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the completed transcription job'),
      format: z
        .enum(['srt', 'vtt'])
        .describe('Caption format: "srt" for SubRip or "vtt" for WebVTT'),
      speakerChannel: z
        .number()
        .optional()
        .describe('Speaker channel to get captions for (for multi-channel audio)')
    })
  )
  .output(
    z.object({
      captions: z.string().describe('Caption content in the requested format'),
      format: z.string().describe('Caption format used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let captions = await client.getCaptions(
      ctx.input.jobId,
      ctx.input.format,
      ctx.input.speakerChannel
    );

    return {
      output: {
        captions,
        format: ctx.input.format
      },
      message: `Retrieved **${ctx.input.format.toUpperCase()}** captions for job **${ctx.input.jobId}**.`
    };
  })
  .build();
