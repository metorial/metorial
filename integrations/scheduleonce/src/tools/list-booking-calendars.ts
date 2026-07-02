import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookingCalendarSchema = z.object({
  calendarId: z.string().describe('Unique booking calendar identifier'),
  subject: z.string().describe('Customer-facing subject/title'),
  name: z.string().describe('Internal name of the booking calendar'),
  host: z.string().describe('User ID of the host'),
  url: z.string().describe('Public booking URL'),
  published: z.boolean().describe('Whether the calendar is published'),
  durationMinutes: z.number().describe('Meeting duration in minutes')
});

export let listBookingCalendars = SlateTool.create(spec, {
  name: 'List Booking Calendars',
  key: 'list_booking_calendars',
  description: `Retrieve all booking calendars in your ScheduleOnce account.
Booking calendars are scheduling resources that define how meetings are offered to customers, supporting single-host, multi-host, and multi-guest setups.`,
  constraints: ['Maximum 100 calendars per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of calendars to return (1-100, default 10)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of booking calendars'),
      calendars: z.array(bookingCalendarSchema).describe('List of booking calendars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBookingCalendars({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let calendars = (result.data || []).map(c => ({
      calendarId: c.id,
      subject: c.subject,
      name: c.name,
      host: c.host,
      url: c.url,
      published: c.published,
      durationMinutes: c.duration_minutes
    }));

    return {
      output: {
        count: result.count,
        calendars
      },
      message: `Found **${result.count}** booking calendar(s). Returned **${calendars.length}** in this page.`
    };
  })
  .build();
