import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

let eventDateSchema = z.object({
  dateId: z.number().describe('Unique ID of the event date/session'),
  datetime: z.string().describe('Scheduled date and time of the session'),
  status: z.string().optional().describe('Status of the event date'),
  timestamp: z.number().optional().describe('Scheduled time as a Unix timestamp'),
  timezone: z.string().optional().describe('Timezone of the event date')
});

let eventSchema = z.object({
  eventId: z.number().describe('Unique ID of the event'),
  name: z.string().describe('Name of the event'),
  status: z.string().optional().describe('Status of the event'),
  description: z.string().optional().describe('Description of the event'),
  dateId: z
    .number()
    .optional()
    .describe('Representative session ID for registration or participant reports'),
  timestamp: z.number().optional().describe('Representative session time as a Unix timestamp'),
  timezone: z.string().optional().describe('Representative session timezone'),
  registrationUrl: z.string().optional().describe('Public registration URL'),
  eventDates: z.array(eventDateSchema).optional().describe('Scheduled dates for the event')
});

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List webinar events from your Demio account, each with a representative session ID and scheduled time. Filter by upcoming, past, or automated events. Use get_event for the full session list.`,
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
        .describe(
          'Filter events by type. If omitted, Demio returns every event with its nearest session.'
        )
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

    let events = rawEvents.map(event => ({
      eventId: event.id,
      name: event.name,
      status: event.status,
      description: event.description ?? undefined,
      dateId: event.date_id,
      timestamp: event.timestamp,
      timezone: event.zone,
      registrationUrl: event.registration_url,
      eventDates: event.event_dates?.map(d => ({
        dateId: d.date_id,
        datetime: d.datetime,
        status: d.status,
        timestamp: d.timestamp,
        timezone: d.zone ?? d.timezone
      }))
    }));

    return {
      output: { events },
      message: `Found **${events.length}** ${ctx.input.eventType ? `${ctx.input.eventType} ` : ''}event(s).`
    };
  })
  .build();
