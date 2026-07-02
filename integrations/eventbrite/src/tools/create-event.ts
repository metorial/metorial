import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new event within an organization. Requires a name, start/end times with timezone, and currency. Optionally set a venue, organizer, capacity, and visibility.`,
  instructions: [
    'Times must be in UTC format (e.g., "2024-12-25T18:00:00Z") with a valid timezone identifier (e.g., "America/New_York").',
    'Currency must be a valid ISO 4217 code (e.g., "USD", "EUR").'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'The organization ID. Falls back to the configured organization ID if not provided.'
        ),
      name: z.string().describe('The name/title of the event.'),
      description: z.string().optional().describe('HTML description of the event.'),
      startUtc: z.string().describe('UTC start time (e.g., "2024-12-25T18:00:00Z").'),
      startTimezone: z
        .string()
        .describe('Timezone for the start time (e.g., "America/New_York").'),
      endUtc: z.string().describe('UTC end time (e.g., "2024-12-25T21:00:00Z").'),
      endTimezone: z
        .string()
        .describe('Timezone for the end time (e.g., "America/New_York").'),
      currency: z.string().describe('Currency code (e.g., "USD").'),
      onlineEvent: z.boolean().optional().describe('Whether this is an online event.'),
      listed: z.boolean().optional().describe('Whether the event should be publicly listed.'),
      shareable: z.boolean().optional().describe('Whether the event is shareable.'),
      capacity: z.number().optional().describe('Maximum number of attendees.'),
      venueId: z.string().optional().describe('ID of the venue for the event.'),
      organizerId: z.string().optional().describe('ID of the organizer.'),
      categoryId: z.string().optional().describe('Category ID for the event.'),
      formatId: z.string().optional().describe('Format ID for the event.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('The ID of the newly created event.'),
      name: z.string().describe('The name of the event.'),
      url: z.string().optional().describe('The public URL of the event.'),
      status: z
        .string()
        .optional()
        .describe('The initial status of the event (usually "draft").')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) {
      throw new Error(
        'Organization ID is required. Provide it in the input or configure it globally.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let event = await client.createEvent(orgId, {
      name: { html: ctx.input.name },
      description: ctx.input.description ? { html: ctx.input.description } : undefined,
      start: { timezone: ctx.input.startTimezone, utc: ctx.input.startUtc },
      end: { timezone: ctx.input.endTimezone, utc: ctx.input.endUtc },
      currency: ctx.input.currency,
      online_event: ctx.input.onlineEvent,
      listed: ctx.input.listed,
      shareable: ctx.input.shareable,
      capacity: ctx.input.capacity,
      venue_id: ctx.input.venueId,
      organizer_id: ctx.input.organizerId,
      category_id: ctx.input.categoryId,
      format_id: ctx.input.formatId
    });

    return {
      output: {
        eventId: event.id,
        name: event.name?.html || event.name?.text || ctx.input.name,
        url: event.url,
        status: event.status
      },
      message: `Created event **${ctx.input.name}** with ID \`${event.id}\` (status: ${event.status || 'draft'}).`
    };
  })
  .build();
