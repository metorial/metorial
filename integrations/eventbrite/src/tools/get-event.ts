import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getEventName } from '../lib/events';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve detailed information about a specific Eventbrite event by its ID. Returns the event's name, description, start/end times, status, capacity, venue, organizer, and other metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The ID of the event to retrieve.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('The unique ID of the event.'),
      name: z.string().describe('The name/title of the event.'),
      description: z
        .string()
        .optional()
        .describe(
          'Description or summary supplied on the event object. Use get_event_description for the full rendered HTML description.'
        ),
      url: z.string().optional().describe('The public URL of the event on Eventbrite.'),
      startUtc: z.string().optional().describe('UTC start time of the event.'),
      startTimezone: z.string().optional().describe('Timezone of the event start time.'),
      endUtc: z.string().optional().describe('UTC end time of the event.'),
      endTimezone: z.string().optional().describe('Timezone of the event end time.'),
      organizationId: organizationIdSchema,
      organizerId: z.string().optional().describe('ID of the organizer of the event.'),
      venueId: z.string().optional().describe('ID of the venue for the event.'),
      categoryId: z.string().optional().describe('ID of the category the event belongs to.'),
      formatId: z.string().optional().describe('ID of the format of the event.'),
      capacity: z.number().optional().describe('Maximum capacity of the event.'),
      status: z
        .string()
        .optional()
        .describe(
          'Current status of the event (draft, live, started, ended, completed, canceled).'
        ),
      currency: z.string().optional().describe('The currency used for the event.'),
      listed: z.boolean().optional().describe('Whether the event is publicly listed.'),
      onlineEvent: z.boolean().optional().describe('Whether the event is online.'),
      shareable: z.boolean().optional().describe('Whether the event is shareable.'),
      created: z.string().optional().describe('When the event was created.'),
      changed: z.string().optional().describe('When the event was last changed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let event = await client.getEvent(ctx.input.eventId);

    let output = {
      eventId: event.id,
      name: getEventName(event.name),
      description: event.description?.html ?? undefined,
      url: event.url ?? undefined,
      startUtc: event.start?.utc ?? undefined,
      startTimezone: event.start?.timezone ?? undefined,
      endUtc: event.end?.utc ?? undefined,
      endTimezone: event.end?.timezone ?? undefined,
      organizationId: event.organization_id ?? undefined,
      organizerId: event.organizer_id ?? undefined,
      venueId: event.venue_id ?? undefined,
      categoryId: event.category_id ?? undefined,
      formatId: event.format_id ?? undefined,
      capacity: event.capacity ?? undefined,
      status: event.status ?? undefined,
      currency: event.currency ?? undefined,
      listed: event.listed ?? undefined,
      onlineEvent: event.online_event ?? undefined,
      shareable: event.shareable ?? undefined,
      created: event.created ?? undefined,
      changed: event.changed ?? undefined
    };

    return {
      output,
      message: `Retrieved event **${output.name}** (status: ${output.status}).`
    };
  })
  .build();
