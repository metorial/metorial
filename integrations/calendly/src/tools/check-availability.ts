import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calendlyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let checkAvailability = SlateTool.create(spec, {
  name: 'Check Availability',
  key: 'check_availability',
  description: `Check available time slots for a specific event type, retrieve a user's busy times, or list availability schedules. Combine these to understand when a user can be booked.`,
  instructions: [
    'For available time slots, provide eventTypeUri with startTime and endTime (max 7-day range, must be in the future).',
    'For busy times, provide userUri with startTime and endTime.',
    'For availability schedules, provide only userUri.',
    'All times must be in ISO 8601 format.'
  ],
  constraints: [
    'Available times query supports a maximum 7-day range.',
    'Start and end times must be in the future.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventTypeUri: z
        .string()
        .optional()
        .describe('Event type URI to check available slots for'),
      userUri: z
        .string()
        .optional()
        .describe('User URI to check busy times or availability schedules for'),
      startTime: z.string().optional().describe('Start of the time range (ISO 8601)'),
      endTime: z.string().optional().describe('End of the time range (ISO 8601)')
    })
  )
  .output(
    z.object({
      availableTimes: z
        .array(
          z.object({
            status: z.string().describe('Availability status'),
            inviteesRemaining: z.number().describe('Number of invitee spots remaining'),
            startTime: z.string().describe('Available time slot start (ISO 8601)'),
            schedulingUrl: z.string().describe('URL to book this time slot')
          })
        )
        .optional()
        .describe('Available booking slots for the event type'),
      busyTimes: z
        .array(
          z.object({
            type: z.string().describe('Type of busy time'),
            startTime: z.string().describe('Busy period start (ISO 8601)'),
            endTime: z.string().describe('Busy period end (ISO 8601)')
          })
        )
        .optional()
        .describe('User busy time periods'),
      availabilitySchedules: z
        .array(
          z.object({
            scheduleUri: z.string(),
            name: z.string(),
            isDefault: z.boolean(),
            timezone: z.string(),
            rules: z.array(z.any())
          })
        )
        .optional()
        .describe('User availability schedules with rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let output: Record<string, any> = {};
    let messages: string[] = [];
    let hasTimeRange = Boolean(ctx.input.startTime && ctx.input.endTime);
    let hasPartialTimeRange =
      Boolean(ctx.input.startTime || ctx.input.endTime) && !hasTimeRange;

    if (hasPartialTimeRange) {
      throw calendlyServiceError('Provide both startTime and endTime, or omit both.');
    }

    if (ctx.input.eventTypeUri && !hasTimeRange) {
      throw calendlyServiceError(
        'Provide startTime and endTime when checking event type availability.'
      );
    }

    if (!ctx.input.eventTypeUri && !ctx.input.userUri) {
      throw calendlyServiceError(
        'Provide eventTypeUri with a time range, or userUri for busy times or availability schedules.'
      );
    }

    if (ctx.input.eventTypeUri && hasTimeRange) {
      let availableTimes = await client.getAvailableTimes({
        eventTypeUri: ctx.input.eventTypeUri,
        startTime: ctx.input.startTime!,
        endTime: ctx.input.endTime!
      });
      output.availableTimes = availableTimes;
      messages.push(`Found **${availableTimes.length}** available time slots.`);
    }

    if (ctx.input.userUri && hasTimeRange) {
      let busyTimes = await client.getUserBusyTimes({
        userUri: ctx.input.userUri,
        startTime: ctx.input.startTime!,
        endTime: ctx.input.endTime!
      });
      output.busyTimes = busyTimes;
      messages.push(`Found **${busyTimes.length}** busy time periods.`);
    }

    if (ctx.input.userUri && !ctx.input.startTime) {
      let schedules = await client.listAvailabilitySchedules(ctx.input.userUri);
      output.availabilitySchedules = schedules.map(s => ({
        scheduleUri: s.uri,
        name: s.name,
        isDefault: s.default,
        timezone: s.timezone,
        rules: s.rules
      }));
      messages.push(`Found **${schedules.length}** availability schedules.`);
    }

    return {
      output,
      message: messages.join(' ')
    };
  })
  .build();
