import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelEventTool = SlateTool.create(spec, {
  name: 'Cancel Event',
  key: 'cancel_event',
  description: `Cancel an existing SavvyCal event. Optionally provide a cancellation reason that will be included in notifications.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to cancel'),
      cancelReason: z.string().optional().describe('Reason for the cancellation')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the canceled event'),
      state: z.string().describe('Updated event state'),
      canceledAt: z.string().nullable().optional().describe('Cancellation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let e = await client.cancelEvent(ctx.input.eventId, {
      cancelReason: ctx.input.cancelReason
    });

    return {
      output: {
        eventId: e.id,
        state: e.state,
        canceledAt: e.canceled_at
      },
      message: `Canceled event **${e.id}**.${ctx.input.cancelReason ? ` Reason: ${ctx.input.cancelReason}` : ''}`
    };
  })
  .build();
