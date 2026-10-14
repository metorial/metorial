import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAvailableTimeSlots = SlateTool.create(spec, {
  name: 'Get Available Time Slots',
  key: 'get_available_time_slots',
  description:
    'Find available appointment times and offered locations for a booking calendar. Call list_booking_calendars to discover calendar IDs.',
  constraints: ['Use UTC ISO 8601 timestamps and a positive interval of at most 30 days.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      calendarId: z
        .string()
        .min(1)
        .describe('Booking calendar ID. Call list_booking_calendars to discover IDs.'),
      startTime: z.iso.datetime().describe('Start of the search interval in UTC'),
      endTime: z.iso.datetime().describe('End of the search interval in UTC')
    })
  )
  .output(
    z.object({
      calendarId: z.string().describe('Booking calendar ID'),
      slots: z.array(
        z.object({
          startTime: z.string().describe('Available appointment start time in UTC'),
          locations: z.array(
            z.object({
              type: z.string().describe('Offered meeting location type'),
              value: z
                .string()
                .nullable()
                .describe('Location address or conferencing provider'),
              id: z.string().nullable().describe('Physical address ID, when applicable')
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let interval = Date.parse(ctx.input.endTime) - Date.parse(ctx.input.startTime);
    if (interval <= 0 || interval > 30 * 24 * 60 * 60 * 1000) {
      throw createApiServiceError(
        'endTime must be after startTime and at most 30 days later.',
        {
          reason: 'invalid_availability_interval'
        }
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let slots = await client.getAvailableTimeSlots(
      ctx.input.calendarId,
      ctx.input.startTime,
      ctx.input.endTime
    );
    return {
      output: {
        calendarId: ctx.input.calendarId,
        slots: slots.map(slot => ({ startTime: slot.start_time, locations: slot.locations }))
      },
      message: `Found **${slots.length}** available time slot(s).`
    };
  })
  .build();
