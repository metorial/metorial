import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelEvent = SlateTool.create(spec, {
  name: 'Cancel Event',
  key: 'cancel_event',
  description: `Cancel a scheduled Calendly event. Optionally provide a cancellation reason. This cancels the entire event, not individual invitees in a group event.`,
  constraints: [
    'Cannot cancel individual invitees in a group event — the entire event is canceled.',
    'Rescheduling is not supported via the API. To reschedule, cancel and have the invitee rebook.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventUri: z.string().describe('URI or UUID of the scheduled event to cancel'),
      reason: z.string().optional().describe('Reason for cancellation')
    })
  )
  .output(
    z.object({
      canceled: z.boolean().describe('Whether the event was successfully canceled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.cancelEvent(ctx.input.eventUri, ctx.input.reason);

    return {
      output: {
        canceled: true
      },
      message: `Event successfully canceled.${ctx.input.reason ? ` Reason: "${ctx.input.reason}"` : ''}`
    };
  })
  .build();
