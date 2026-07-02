import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Delete a Fomo event by its ID. This permanently removes the notification from your live feed. Useful for building "opt out" functionality or cleaning up test events.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Unique ID of the event to delete.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteEvent(ctx.input.eventId);

    return {
      output: {
        message: result.message
      },
      message: `Deleted event **#${ctx.input.eventId}**.`
    };
  })
  .build();
