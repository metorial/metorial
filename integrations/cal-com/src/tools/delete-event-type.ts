import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEventType = SlateTool.create(spec, {
  name: 'Delete Event Type',
  key: 'delete_event_type',
  description: `Permanently delete an event type. Only the event type owner can perform this action. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventTypeId: z.number().describe('ID of the event type to delete')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Deletion confirmation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.deleteEventType(ctx.input.eventTypeId);

    return {
      output: { result },
      message: `Event type **${ctx.input.eventTypeId}** deleted.`
    };
  })
  .build();
