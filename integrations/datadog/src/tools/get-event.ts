import { SlateTool } from 'slates';
import { z } from 'zod';
import { datadogServiceError } from '../lib/errors';
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
      eventId: z
        .number()
        .optional()
        .describe(
          'Legacy numeric Event ID. Prefer eventIdString to avoid rounding large IDs.'
        ),
      eventIdString: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .describe(
          'Exact Event ID returned by post_event or list_events. Preferred over eventId; provide one of these fields.'
        )
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      eventIdString: z.string().optional().describe('Exact Event ID for subsequent retrieval'),
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
    let eventId = ctx.input.eventIdString ?? ctx.input.eventId;
    if (eventId === undefined) {
      throw datadogServiceError('Provide eventIdString or eventId to retrieve an event.');
    }
    if (typeof eventId === 'number' && !Number.isSafeInteger(eventId)) {
      throw datadogServiceError(
        'This numeric Event ID may have lost precision. Use eventIdString from post_event or list_events.'
      );
    }
    let result = await client.getEvent(eventId);
    let event = result.event || result;

    return {
      output: {
        eventId: event.id ?? Number(eventId),
        eventIdString: event.id_str ?? String(eventId),
        title: event.title,
        text: event.text ?? undefined,
        dateHappened: event.date_happened ?? undefined,
        priority: event.priority ?? undefined,
        host: event.host ?? undefined,
        tags: event.tags ?? undefined,
        alertType: event.alert_type ?? undefined,
        sourceTypeName: event.source_type_name ?? undefined
      },
      message: `Retrieved event **${event.title || ctx.input.eventId}**`
    };
  })
  .build();
