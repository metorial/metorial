import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calComServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getAvailableSlots = SlateTool.create(spec, {
  name: 'Get Available Slots',
  key: 'get_available_slots',
  description: `Query available booking time slots for a given event type within a date range. Slots can be looked up by event type ID, event type slug plus username or team slug, or usernames. Useful for finding open times before creating a booking.`,
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
      teamSlug: z
        .string()
        .optional()
        .describe('Team slug when checking a team event type by slug'),
      organizationSlug: z
        .string()
        .optional()
        .describe('Organization slug when checking an organization-scoped event type'),
      usernames: z
        .array(z.string())
        .optional()
        .describe('Usernames to check for collective or round-robin event types'),
      start: z.string().optional().describe('Start of the date range (ISO 8601)'),
      end: z.string().optional().describe('End of the date range (ISO 8601)'),
      startTime: z.string().optional().describe('Deprecated alias for start. Prefer start.'),
      endTime: z.string().optional().describe('Deprecated alias for end. Prefer end.'),
      timeZone: z
        .string()
        .optional()
        .describe('Time zone for the returned slots (e.g., America/New_York)'),
      format: z.enum(['time', 'range']).optional().describe('Slot response format'),
      duration: z.number().optional().describe('Requested slot duration in minutes'),
      bookingUidToReschedule: z
        .string()
        .optional()
        .describe('Booking UID to exclude while finding reschedule slots')
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

    let start = ctx.input.start ?? ctx.input.startTime;
    let end = ctx.input.end ?? ctx.input.endTime;
    if (!start || !end) {
      throw calComServiceError('start and end are required.');
    }

    let hasEventTypeId = ctx.input.eventTypeId !== undefined;
    let hasSlugTarget =
      !!ctx.input.eventTypeSlug && (!!ctx.input.username || !!ctx.input.teamSlug);
    let hasUsernames = !!ctx.input.usernames && ctx.input.usernames.length > 0;
    if (!hasEventTypeId && !hasSlugTarget && !hasUsernames) {
      throw calComServiceError(
        'Provide eventTypeId, eventTypeSlug with username or teamSlug, or usernames.'
      );
    }

    let params: Record<string, any> = {
      start,
      end
    };

    if (ctx.input.eventTypeId !== undefined) params.eventTypeId = ctx.input.eventTypeId;
    if (ctx.input.eventTypeSlug) params.eventTypeSlug = ctx.input.eventTypeSlug;
    if (ctx.input.username) params.username = ctx.input.username;
    if (ctx.input.teamSlug) params.teamSlug = ctx.input.teamSlug;
    if (ctx.input.organizationSlug) params.organizationSlug = ctx.input.organizationSlug;
    if (ctx.input.usernames) params.usernames = ctx.input.usernames;
    if (ctx.input.timeZone) params.timeZone = ctx.input.timeZone;
    if (ctx.input.format) params.format = ctx.input.format;
    if (ctx.input.duration !== undefined) params.duration = ctx.input.duration;
    if (ctx.input.bookingUidToReschedule)
      params.bookingUidToReschedule = ctx.input.bookingUidToReschedule;

    let slots = await client.getAvailableSlots(params);

    return {
      output: { slots },
      message: `Retrieved available slots from ${start} to ${end}.`
    };
  })
  .build();
