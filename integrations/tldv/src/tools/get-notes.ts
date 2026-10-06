import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let getNotes = SlateTool.create(spec, {
  name: 'Get Notes',
  key: 'get_notes',
  description:
    'Retrieve meeting notes as structured segments, ordered topics and Markdown content. Use list_meetings to discover accessible meeting IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      meetingId: z.string().min(1).describe('Meeting identifier from list_meetings.')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Meeting these notes belong to.'),
      structuredNotes: z.array(
        z.object({
          segmentId: z.string().describe('Note segment identifier.'),
          timestamp: z.number().describe('Position in the recording in seconds.'),
          text: z.string().describe('Note content.'),
          topicId: z.string().describe('Associated topic identifier.')
        })
      ),
      markdownContent: z.string().describe('Meeting notes in Markdown.'),
      topics: z.array(
        z.object({
          id: z.string().describe('Topic identifier.'),
          order: z.number().describe('Topic display order.'),
          title: z.string().describe('Topic title.'),
          summary: z.string().describe('Topic summary.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let notes = await client.getNotes(ctx.input.meetingId);
    return {
      output: { meetingId: ctx.input.meetingId, ...notes },
      message: `Retrieved notes for meeting \`${ctx.input.meetingId}\`.`
    };
  })
  .build();
