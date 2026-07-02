import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventType = SlateTool.create(spec, {
  name: 'Get Event Type',
  key: 'get_event_type',
  description: `Retrieve a specific Cal.com event type by ID, including booking URL, duration, locations, schedule, booking fields, and host details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventTypeId: z.number().describe('ID of the event type to retrieve')
    })
  )
  .output(
    z.object({
      eventType: z.any().describe('Event type details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let eventType = await client.getEventType(ctx.input.eventTypeId);

    return {
      output: { eventType },
      message: `Event type **${ctx.input.eventTypeId}** retrieved.`
    };
  })
  .build();
