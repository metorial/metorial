import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });

    let eventUpdate: any = {};
    if (ctx.input.name) eventUpdate.name = { html: ctx.input.name };
    if (ctx.input.description) eventUpdate.description = { html: ctx.input.description };
    if (ctx.input.startUtc && ctx.input.startTimezone) {
      eventUpdate.start = { timezone: ctx.input.startTimezone, utc: ctx.input.startUtc };
    }
    if (ctx.input.endUtc && ctx.input.endTimezone) {
      eventUpdate.end = { timezone: ctx.input.endTimezone, utc: ctx.input.endUtc };
    }
    if (ctx.input.currency) eventUpdate.currency = ctx.input.currency;
    if (ctx.input.onlineEvent !== undefined) eventUpdate.online_event = ctx.input.onlineEvent;
    if (ctx.input.listed !== undefined) eventUpdate.listed = ctx.input.listed;
    if (ctx.input.shareable !== undefined) eventUpdate.shareable = ctx.input.shareable;
    if (ctx.input.capacity !== undefined) eventUpdate.capacity = ctx.input.capacity;
    if (ctx.input.venueId) eventUpdate.venue_id = ctx.input.venueId;
    if (ctx.input.organizerId) eventUpdate.organizer_id = ctx.input.organizerId;
    if (ctx.input.categoryId) eventUpdate.category_id = ctx.input.categoryId;
    if (ctx.input.formatId) eventUpdate.format_id = ctx.input.formatId;

    let event = await client.updateEvent(ctx.input.eventId, eventUpdate);

    return {
      output: {
        eventId: event.id,
        name: event.name?.html || event.name?.text || '',
        status: event.status,
        url: event.url
      },
      message: `Updated event **${event.name?.html || event.name?.text || event.id}**.`
    };
  })
  .build();
