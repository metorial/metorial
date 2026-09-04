import { SlateTool } from 'slates';
import { z } from 'zod';
import { GranolaClient } from '../lib/client';
import { getMeetingsOutputSchema, meetingIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getMeetings = SlateTool.create(spec, {
  name: 'Get Meetings',
  key: 'get_meetings',
  description:
    'Retrieve full Granola meeting details for 1 to 10 note IDs, including attendees, calendar context, folder membership, summaries, and available private notes. Results preserve input order and do not include transcripts.',
  instructions: [
    'Use get_meeting_transcript when transcript content is needed.',
    'The meetings are fetched sequentially. If any note fails, the entire invocation fails and identifies the affected note ID.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      meetingIds: z
        .array(meetingIdSchema)
        .min(1)
        .max(10)
        .describe('Granola note IDs to retrieve, in the desired output order.')
    })
  )
  .output(getMeetingsOutputSchema)
  .handleInvocation(async ctx => {
    let meetings = await new GranolaClient(ctx.auth).getMeetings(ctx.input.meetingIds);

    return {
      output: { meetings },
      message: `Retrieved ${meetings.length} Granola meetings.`
    };
  })
  .build();
