import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let getHighlights = SlateTool.create(spec, {
  name: 'Get Highlights',
  key: 'get_highlights',
  description:
    'DEPRECATED — use `get_notes` instead. Retrieve meeting highlights with text, timestamps, sources and topics. Available only after transcript processing is complete.',
  instructions: ['Use get_notes for the current structured notes and Markdown content.'],
  constraints: [
    'Highlights are only available after the transcript has been fully processed.'
  ],
  tags: {
    destructive: false,
    readOnly: true,
    deprecated: true
  }
})
  .input(
    z.object({
      meetingId: z
        .string()
        .describe('The unique identifier of the meeting whose highlights to retrieve.')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('The meeting these highlights belong to.'),
      highlights: z
        .array(
          z.object({
            text: z.string().describe('Highlight text content.'),
            startTime: z
              .number()
              .describe('Start time in seconds when this highlight occurs.'),
            source: z.string().describe('Source of the highlight ("auto" or "manual").'),
            topicTitle: z.string().describe('Title of the topic this highlight belongs to.'),
            topicSummary: z.string().describe('Summary of the topic.')
          })
        )
        .describe('List of meeting highlights.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let result = await client.getHighlights(ctx.input.meetingId);

    let highlights = (result.data ?? []).map(h => ({
      text: h.text,
      startTime: h.startTime,
      source: h.source,
      topicTitle: h.topic?.title ?? '',
      topicSummary: h.topic?.summary ?? ''
    }));

    return {
      output: {
        meetingId: result.meetingId,
        highlights
      },
      message: `Retrieved **${highlights.length}** highlight(s) for meeting \`${ctx.input.meetingId}\`.`
    };
  })
  .build();
