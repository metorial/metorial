import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTranscript = SlateTool.create(spec, {
  name: 'Delete Transcript',
  key: 'delete_transcript',
  description: `Permanently delete a meeting transcript. This action cannot be undone. Requires admin access to the transcript.`,
  constraints: [
    'Rate limited to 10 requests per minute.',
    'Requires admin privileges or transcript ownership.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique identifier of the transcript to delete')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('ID of the deleted transcript'),
      title: z.string().nullable().describe('Title of the deleted transcript'),
      date: z.string().nullable().describe('Date of the deleted transcript')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let result = await client.deleteTranscript(ctx.input.transcriptId);

    return {
      output: {
        transcriptId: result?.id ?? ctx.input.transcriptId,
        title: result?.title ?? null,
        date: result?.date ? String(result.date) : null
      },
      message: `Deleted transcript **"${result?.title ?? ctx.input.transcriptId}"**.`
    };
  })
  .build();
