import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Get a specific Datadog event by ID, including its title, text, tags, host, priority, and alert type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      title: z.string().optional().describe('Event title'),
      text: z.string().optional().describe('Event body text'),
      dateHappened: z.number().optional().describe('Unix timestamp when the event happened'),
      priority: z.string().optional().describe('Event priority'),
      host: z.string().optional().describe('Associated host'),
      tags: z.array(z.string()).optional().describe('Event tags'),
      alertType: z.string().optional().describe('Event alert type'),
      sourceTypeName: z.string().optional().describe('Event source type')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.getEvent(ctx.input.eventId);
    let event = result.event || result;

    return {
      output: {
        eventId: event.id || ctx.input.eventId,
        title: event.title,
        text: event.text,
        dateHappened: event.date_happened,
        priority: event.priority,
        host: event.host,
        tags: event.tags,
        alertType: event.alert_type,
        sourceTypeName: event.source_type_name
      },
      message: `Retrieved event **${event.title || ctx.input.eventId}**`
    };
  })
  .build();
