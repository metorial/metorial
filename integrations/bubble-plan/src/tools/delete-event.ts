import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Permanently delete a calendar event from Project Bubble.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the event was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    await client.deleteEvent(ctx.input.eventId);

    return {
      output: { deleted: true },
      message: `Deleted event **${ctx.input.eventId}**.`
    };
  })
  .build();
