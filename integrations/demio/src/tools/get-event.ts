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
      eventId: z.string().describe('The ID of the event to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Unique ID of the event'),
      name: z.string().describe('Name of the event'),
      status: z.string().optional().describe('Status of the event'),
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

    let event = await client.getEvent(ctx.input.eventId);

    return {
      output: {
        eventId: event.id,
        name: event.name,
        status: event.status,
        eventType: event.type,
        registrationUrl: event.registration_url,
        eventDates: event.event_dates?.map(d => ({
          dateId: d.date_id,
          datetime: d.datetime,
          status: d.status,
          timezone: d.timezone
        }))
      },
      message: `Retrieved event **${event.name}** (ID: ${event.id}).`
    };
  })
  .build();
