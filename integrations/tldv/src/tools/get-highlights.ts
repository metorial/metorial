import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let getHighlights = SlateTool.create(spec, {
  name: 'Get Highlights',
  key: 'get_highlights',
  description: `Retrieve AI-generated highlights (notes) for a meeting. Each highlight includes the text, timestamp, source (manual or AI-generated), and an associated topic with title and summary. Only available after the transcript is complete.`,
  constraints: [
    'Highlights are only available after the transcript has been fully processed.'
  ],
  tags: {
    destructive: false,
    readOnly: true
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
            source: z.string().describe('Source of the highlight (e.g., "ai" or "manual").'),
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
