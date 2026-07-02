import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let calendarEventChangeTrigger = SlateTrigger.create(spec, {
  name: 'Calendar Event Change',
  key: 'calendar_event_change',
  description:
    'Triggers when calendar events are created, updated, or deleted. Receives the calendar.sync_events webhook and fetches the changed events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of calendar event change'),
      eventId: z.string().describe('Unique event identifier'),
      calendarEventId: z.string().describe('Calendar event ID'),
      calendarId: z.string().describe('Calendar ID'),
      meetingUrl: z.string().nullable().describe('Meeting URL'),
      meetingPlatform: z.string().nullable().describe('Meeting platform'),
      startTime: z.string().describe('Event start time'),
      endTime: z.string().describe('Event end time'),
      title: z.string().nullable().describe('Event title'),
      isDeleted: z.boolean().describe('Whether the event was deleted')
    })
  )
  .output(
    z.object({
      calendarEventId: z.string().describe('Calendar event unique identifier'),
      calendarId: z.string().describe('Calendar this event belongs to'),
      meetingUrl: z.string().nullable().describe('Meeting URL from the event'),
      meetingPlatform: z.string().nullable().describe('Detected meeting platform'),
      startTime: z.string().describe('Event start time (ISO 8601)'),
      endTime: z.string().describe('Event end time (ISO 8601)'),
      title: z.string().nullable().describe('Event title'),
      isDeleted: z.boolean().describe('Whether the event was deleted')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let webhookEvent = String(data.event || data.type || 'calendar.sync_events');
      let webhookData = (data.data || data) as Record<string, unknown>;

      // For calendar.sync_events, we need to fetch changed events
      if (webhookEvent === 'calendar.sync_events' || webhookEvent === 'calendar.update') {
        let lastUpdatedTs = webhookData.last_updated_ts
          ? String(webhookData.last_updated_ts)
          : undefined;
        let calendarId = webhookData.calendar_id ? String(webhookData.calendar_id) : undefined;

        let client = new Client({
          token: ctx.auth.token,
          region: ctx.config.region
        });

        let changedEvents = await client.listCalendarEvents({
          calendarId,
          updatedAtGte: lastUpdatedTs
        });

        return {
          inputs: changedEvents.results.map(evt => ({
            eventType: evt.isDeleted ? 'deleted' : 'updated',
            eventId: `${evt.id}-${evt.updatedAt}`,
            calendarEventId: evt.id,
            calendarId: evt.calendarId,
            meetingUrl: evt.meetingUrl,
            meetingPlatform: evt.meetingPlatform,
            startTime: evt.startTime,
            endTime: evt.endTime,
            title: evt.title,
            isDeleted: evt.isDeleted
          }))
        };
      }

      // Fallback for direct event payloads
      let eventData = (webhookData.calendar_event || webhookData) as Record<string, unknown>;

      return {
        inputs: [
          {
            eventType: String(webhookEvent).replace('calendar.', ''),
            eventId: `${String(eventData.id || '')}-${Date.now()}`,
            calendarEventId: String(eventData.id || ''),
            calendarId: String(eventData.calendar_id || ''),
            meetingUrl: eventData.meeting_url ? String(eventData.meeting_url) : null,
            meetingPlatform: eventData.meeting_platform
              ? String(eventData.meeting_platform)
              : null,
            startTime: String(eventData.start_time || ''),
            endTime: String(eventData.end_time || ''),
            title: eventData.title ? String(eventData.title) : null,
            isDeleted: Boolean(eventData.is_deleted)
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `calendar_event.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          calendarEventId: ctx.input.calendarEventId,
          calendarId: ctx.input.calendarId,
          meetingUrl: ctx.input.meetingUrl,
          meetingPlatform: ctx.input.meetingPlatform,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          title: ctx.input.title,
          isDeleted: ctx.input.isDeleted
        }
      };
    }
  })
  .build();
