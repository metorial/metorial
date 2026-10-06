import { SlateTool } from 'slates';
import { z } from 'zod';
import { type CalendarEvent, Client } from '../lib/client';
import { calendarSchema, eventSchema } from '../lib/schemas';
import { spec } from '../spec';

const eventOutput = (event: CalendarEvent) => ({
  eventId: event.id,
  calendarId: event.calendarId,
  meetingUrl: event.meetingUrl,
  meetingPlatform: event.meetingPlatform,
  startTime: event.startTime,
  endTime: event.endTime,
  title: event.title,
  isDeleted: event.isDeleted,
  updatedAt: event.updatedAt,
  bots: event.bots
});
export const getCalendarTool = SlateTool.create(spec, {
  name: 'Get Calendar',
  key: 'get_calendar',
  description:
    'Read a connected calendar and its connection status. Discover calendar IDs with list_calendars.',
  tags: { readOnly: true }
})
  .input(
    z.object({ calendarId: z.string().min(1).describe('Calendar ID from list_calendars') })
  )
  .output(calendarSchema)
  .handleInvocation(async ctx => {
    const calendar = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).getCalendar(ctx.input.calendarId);
    return {
      output: {
        calendarId: calendar.id,
        platform: calendar.platform,
        platformEmail: calendar.platformEmail,
        status: calendar.status,
        createdAt: calendar.createdAt
      },
      message: `Calendar ${calendar.id} is ${calendar.status}.`
    };
  })
  .build();
export const getCalendarEventTool = SlateTool.create(spec, {
  name: 'Get Calendar Event',
  key: 'get_calendar_event',
  description:
    'Read a calendar event and its scheduled bots. Discover event IDs with list_calendar_events.',
  tags: { readOnly: true }
})
  .input(
    z.object({ eventId: z.string().min(1).describe('Event ID from list_calendar_events') })
  )
  .output(eventSchema)
  .handleInvocation(async ctx => {
    const event = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).getCalendarEvent(ctx.input.eventId);
    return { output: eventOutput(event), message: `Retrieved calendar event ${event.id}.` };
  })
  .build();
export const cancelBotForEventTool = SlateTool.create(spec, {
  name: 'Cancel Bot for Calendar Event',
  key: 'cancel_bot_for_event',
  description:
    'Remove the scheduled bot association from a calendar event. Use this to cancel an upcoming recording after reading the event with get_calendar_event.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({ eventId: z.string().min(1).describe('Event ID from list_calendar_events') })
  )
  .output(eventSchema)
  .handleInvocation(async ctx => {
    const event = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).deleteBotFromCalendarEvent(ctx.input.eventId);
    return {
      output: eventOutput(event),
      message: `Updated bot scheduling for calendar event ${event.id}.`
    };
  })
  .build();
