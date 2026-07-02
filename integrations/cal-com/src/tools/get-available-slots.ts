import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAvailableSlots = SlateTool.create(spec, {
  name: 'Get Available Slots',
  key: 'get_available_slots',
  description: `Query available booking time slots for a given event type within a date range. Slots can be looked up by event type ID, or by event type slug and username combination. Useful for finding open times before creating a booking.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventTypeId: z.number().optional().describe('Event type ID to check slots for'),
      eventTypeSlug: z.string().optional().describe('Event type slug (requires username)'),
      username: z
        .string()
        .optional()
        .describe('Username of the event type owner (used with eventTypeSlug)'),
      startTime: z.string().describe('Start of the date range (ISO 8601)'),
      endTime: z.string().describe('End of the date range (ISO 8601)'),
      timeZone: z
        .string()
        .optional()
        .describe('Time zone for the returned slots (e.g., America/New_York)')
    })
  )
  .output(
    z.object({
      slots: z.any().describe('Available time slots grouped by date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let params: Record<string, any> = {
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime
    };

    if (ctx.input.eventTypeId) params.eventTypeId = ctx.input.eventTypeId;
    if (ctx.input.eventTypeSlug) params.eventTypeSlug = ctx.input.eventTypeSlug;
    if (ctx.input.username) params.username = ctx.input.username;
    if (ctx.input.timeZone) params.timeZone = ctx.input.timeZone;

    let slots = await client.getAvailableSlots(params);

    return {
      output: { slots },
      message: `Retrieved available slots from ${ctx.input.startTime} to ${ctx.input.endTime}.`
    };
  })
  .build();
