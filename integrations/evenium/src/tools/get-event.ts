import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve detailed information about a specific Evenium event by its ID. Returns the event's title, dates, status, description, and URL. Supports both Evenium IDs and external IDs (prefixed with \`ext:\`).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z
        .string()
        .describe(
          'Event ID (Evenium ID or external ID with ext: prefix, e.g. "ext:EV-AB12CD34")'
        )
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      startDate: z.string().describe('Event start date (RFC 3339)'),
      endDate: z.string().optional().describe('Event end date (RFC 3339)'),
      creationDate: z.string().optional().describe('Event creation date (RFC 3339)'),
      status: z.string().optional().describe('Event status'),
      url: z.string().optional().describe('Event URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let event = await client.getEvent(ctx.input.eventId);

    return {
      output: {
        eventId: event.id,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        creationDate: event.creationDate,
        status: event.status,
        url: event.url
      },
      message: `Retrieved event **${event.title}** (${event.status ?? 'unknown status'}).`
    };
  })
  .build();
