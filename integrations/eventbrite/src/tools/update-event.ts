import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getEventName } from '../lib/events';
import { validateEventTimes, validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update an existing event's details. All fields except the event ID are optional — only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The ID of the event to update.'),
      name: z.string().optional().describe('New name/title for the event.'),
      description: z.string().optional().describe('New HTML description.'),
      startUtc: z.string().optional().describe('New UTC start time.'),
      startTimezone: z.string().optional().describe('Timezone for the new start time.'),
      endUtc: z.string().optional().describe('New UTC end time.'),
      endTimezone: z.string().optional().describe('Timezone for the new end time.'),
      currency: z.string().optional().describe('New currency code.'),
      onlineEvent: z.boolean().optional().describe('Whether this is an online event.'),
      listed: z.boolean().optional().describe('Whether the event should be publicly listed.'),
      shareable: z.boolean().optional().describe('Whether the event is shareable.'),
      capacity: z.number().optional().describe('New maximum capacity.'),
      venueId: z.string().optional().describe('New venue ID.'),
      organizerId: z.string().optional().describe('New organizer ID.'),
      categoryId: z.string().optional().describe('New category ID.'),
      formatId: z.string().optional().describe('New format ID.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('The ID of the updated event.'),
      name: z.string().describe('The updated name of the event.'),
      status: z.string().optional().describe('Current status of the event.'),
      url: z.string().optional().describe('The public URL of the event.')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['capacity']);
    validateEventTimes(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let eventUpdate: any = {};
    if (ctx.input.name !== undefined) eventUpdate.name = { html: ctx.input.name };
    if (ctx.input.description !== undefined)
      eventUpdate.description = { html: ctx.input.description };
    if (ctx.input.startUtc && ctx.input.startTimezone) {
      eventUpdate.start = { timezone: ctx.input.startTimezone, utc: ctx.input.startUtc };
    }
    if (ctx.input.endUtc && ctx.input.endTimezone) {
      eventUpdate.end = { timezone: ctx.input.endTimezone, utc: ctx.input.endUtc };
    }
    if (ctx.input.currency !== undefined) eventUpdate.currency = ctx.input.currency;
    if (ctx.input.onlineEvent !== undefined) eventUpdate.online_event = ctx.input.onlineEvent;
    if (ctx.input.listed !== undefined) eventUpdate.listed = ctx.input.listed;
    if (ctx.input.shareable !== undefined) eventUpdate.shareable = ctx.input.shareable;
    if (ctx.input.capacity !== undefined) eventUpdate.capacity = ctx.input.capacity;
    if (ctx.input.venueId !== undefined) eventUpdate.venue_id = ctx.input.venueId;
    if (ctx.input.organizerId !== undefined) eventUpdate.organizer_id = ctx.input.organizerId;
    if (ctx.input.categoryId !== undefined) eventUpdate.category_id = ctx.input.categoryId;
    if (ctx.input.formatId !== undefined) eventUpdate.format_id = ctx.input.formatId;

    if (Object.keys(eventUpdate).length === 0)
      throw createApiServiceError('Provide at least one field to update.');
    let event = await client.updateEvent(ctx.input.eventId, eventUpdate);

    return {
      output: {
        eventId: event.id,
        name: getEventName(event.name),
        status: event.status ?? undefined,
        url: event.url ?? undefined
      },
      message: `Updated event **${event.name?.html || event.name?.text || event.id}**.`
    };
  })
  .build();
