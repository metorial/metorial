import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

let eventDateSchema = z.object({
  dateId: z.number().describe('Unique ID of the event date/session'),
  datetime: z.string().describe('Scheduled date and time of the session'),
  status: z.string().optional().describe('Status of the event date'),
  timezone: z.string().optional().describe('Timezone of the event date')
});

let eventSchema = z.object({
  eventId: z.number().describe('Unique ID of the event'),
  name: z.string().describe('Name of the event'),
  status: z.string().optional().describe('Status of the event'),
  eventDates: z.array(eventDateSchema).optional().describe('Scheduled dates for the event')
});

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List webinar events from your Demio account. Filter by type to get upcoming, past, or automated events. Returns event details including scheduled dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      eventType: z
        .enum(['upcoming', 'past', 'automated'])
        .optional()
        .describe('Filter events by type. If omitted, returns upcoming events.')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DemioClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let rawEvents = await client.listEvents(
      ctx.input.eventType ? { type: ctx.input.eventType } : undefined
    );

    let events = (Array.isArray(rawEvents) ? rawEvents : []).map(event => ({
      eventId: event.id,
      name: event.name,
      status: event.status,
      eventDates: event.event_dates?.map(d => ({
        dateId: d.date_id,
        datetime: d.datetime,
        status: d.status,
        timezone: d.timezone
      }))
    }));

    return {
      output: { events },
      message: `Found **${events.length}** ${ctx.input.eventType ?? 'upcoming'} event(s).`
    };
  })
  .build();
