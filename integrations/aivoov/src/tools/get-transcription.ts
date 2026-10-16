import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTranscription = SlateTool.create(spec, {
  name: 'Get Transcription',
  key: 'get_transcription',
  description:
    'Check a speech recognition job from create_transcription. Completed jobs provide downloadable plain-text transcripts and SRT subtitles. Pending jobs report their current status.',
  constraints: ['GET endpoints allow 100 requests per minute.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned by create_transcription.')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Requested transcription job ID.'),
      status: z.string().describe('Provider processing status.'),
      transcriptCharacters: z
        .number()
        .optional()
        .describe('Completed transcript length in characters.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.jobId.trim()) {
      throw createApiServiceError('Provide the jobId returned by create_transcription.');
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTranscription(ctx.input.jobId);
    let transcriptCharacters: number | undefined;
    if (result.status === 'COMPLETED') {
      if (result.text === undefined || result.srt === undefined) {
        throw createApiServiceError(
          'AiVOOV completed the job without its transcript and subtitles.'
        );
      }
      await ctx.addAttachment({
        type: 'content',
        content: new Response(result.text, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }),
        filename: 'transcript.txt'
      });
      await ctx.addAttachment({
        type: 'content',
        content: new Response(result.srt, {
          headers: { 'Content-Type': 'application/x-subrip; charset=utf-8' }
        }),
        filename: 'subtitles.srt'
      });
      transcriptCharacters = Array.from(result.text).length;
    }
    return {
      output: {
        jobId: ctx.input.jobId,
        status: result.status,
        transcriptCharacters
      },
      message:
        result.status === 'COMPLETED'
          ? 'Transcription completed. The transcript and SRT subtitles are ready to download.'
          : `Transcription job is **${result.status}**. Check again later.`
    };
  })
  .build();
