import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient, eventDateSchema as providerEventDateSchema } from '../lib/client';
import { spec } from '../spec';

let eventDateSchema = z.object({
  dateId: z.number().describe('Unique ID of the event date/session'),
  datetime: z
    .string()
    .optional()
    .describe('Scheduled date and time, absent for an undated on-demand session'),
  status: z.string().optional().describe('Status of the event date'),
  timestamp: z.number().optional().describe('Scheduled time as a Unix timestamp'),
  timezone: z.string().optional().describe('Timezone of the event date'),
  raw: providerEventDateSchema
    .optional()
    .describe('Original session fields, preserving unavailable times as returned by Demio')
});

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve detailed information about a specific Demio webinar event, including its type, status, registration URL, and all scheduled dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID from list_events'),
      active: z
        .boolean()
        .optional()
        .describe('Return only active sessions in a series when true')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Unique ID of the event'),
      name: z.string().describe('Name of the event'),
      status: z.string().optional().describe('Status of the event'),
      description: z.string().optional().describe('Description of the event'),
      nextDateId: z
        .number()
        .optional()
        .describe('Next unfinished session ID, absent when there is none'),
      registrantsStayRegistered: z
        .boolean()
        .optional()
        .describe('Whether registrants remain registered throughout a series'),
      eventType: z
        .string()
        .optional()
        .describe('Type of the event (standard, series, automated)'),
      registrationUrl: z.string().optional().describe('Public registration URL for the event'),
      eventDates: z
        .array(eventDateSchema)
        .optional()
        .describe('Scheduled dates for this event')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DemioClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let event = await client.getEvent(ctx.input.eventId, ctx.input.active);

    return {
      output: {
        eventId: event.id,
        name: event.name,
        status: event.status,
        description: event.description ?? undefined,
        nextDateId: event.next_date_id ?? undefined,
        registrantsStayRegistered: event.registrants_stay_registered,
        eventType: event.type,
        registrationUrl: event.registration_url,
        eventDates: (event.dates ?? event.event_dates)?.map(d => ({
          dateId: d.date_id,
          datetime: d.datetime ?? undefined,
          status: d.status,
          timestamp: d.timestamp ?? undefined,
          timezone: d.zone ?? d.timezone,
          raw: d
        }))
      },
      message: `Retrieved event **${event.name}** (ID: ${event.id}).`
    };
  })
  .build();
