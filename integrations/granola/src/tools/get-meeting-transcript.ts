import { SlateTool } from 'slates';
import { z } from 'zod';
import { GranolaClient } from '../lib/client';
import {
  cursorSchema,
  getMeetingTranscriptOutputSchema,
  meetingIdSchema,
  transcriptPageSizeSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let getMeetingTranscript = SlateTool.create(spec, {
  name: 'Get Meeting Transcript',
  key: 'get_meeting_transcript',
  description:
    'Retrieve one page of a Granola meeting transcript, including speaker source and available attribution, diarization labels, resolved names, and timestamps.',
  instructions: [
    'When hasMore is true, pass the returned cursor to the next call for the same meetingId.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      meetingId: meetingIdSchema.describe('Granola note ID whose transcript to retrieve.'),
      cursor: cursorSchema
        .optional()
        .describe('Opaque cursor returned by the previous transcript page.'),
      pageSize: transcriptPageSizeSchema.describe(
        'Maximum number of transcript items to return, from 1 to 100.'
      )
    })
  )
  .output(getMeetingTranscriptOutputSchema)
  .handleInvocation(async ctx => {
    let page = await new GranolaClient(ctx.auth).getMeetingTranscript(ctx.input);

    return {
      output: page,
      message: `Retrieved ${page.transcript.length} transcript items for **${page.meetingId}**.`
    };
  })
  .build();
