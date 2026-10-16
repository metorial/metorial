import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEvent = SlateTool.create(spec, {
  name: 'Cancel or Delete Event',
  key: 'manage_event',
  description:
    'Cancel an event or permanently delete it when Eventbrite permits the operation. Events must have no pending or completed orders. An operation on a series parent affects every occurrence.',
  tags: { destructive: true }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID from list_events or create_event.'),
      action: z
        .enum(['cancel', 'delete'])
        .describe('Cancel the event or permanently delete it.')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      action: z.enum(['cancel', 'delete']),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.action === 'cancel') await client.cancelEvent(ctx.input.eventId);
    else await client.deleteEvent(ctx.input.eventId);
    return {
      output: { eventId: ctx.input.eventId, action: ctx.input.action, success: true },
      message: `Eventbrite confirmed the ${ctx.input.action} operation for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
