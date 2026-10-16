import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawSchema } from '../lib/responses';
import { spec } from '../spec';

export let getMeetingSummary = SlateTool.create(spec, {
  key: 'get_meeting_summary',
  name: 'Get Meeting Summary',
  description:
    'Read the generated summary of a notetaker transcription. Happy Scribe returns 404 when no summary exists or it is not ready.',
  tags: { readOnly: true }
})
  .input(
    z.object({ transcriptionId: z.string().describe('ID of a notetaker transcription.') })
  )
  .output(
    z.object({
      summary: z.string().describe('Generated meeting summary text.'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getMeetingSummary(ctx.input.transcriptionId);
    return {
      output: { summary: result.summary, raw: result },
      message: 'Retrieved the meeting summary.'
    };
  })
  .build();
