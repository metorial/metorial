import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeEventOutputSchema = z.object({
  eventId: z.string().describe('Event identifier'),
  summary: z.string().optional().describe('Event title'),
  startAt: z.string().optional().describe('Event start time'),
  endAt: z.string().optional().describe('Event end time'),
  attendeeId: z.string().describe('Attendee identifier'),
  attendeeName: z.string().describe('Attendee display name'),
  attendeeEmail: z.string().describe('Attendee email'),
  attendeeFirstName: z.string().optional().describe('Attendee first name'),
  attendeeLastName: z.string().optional().describe('Attendee last name'),
  attendeeTimeZone: z.string().optional().describe('Attendee time zone'),
  attendeePhoneNumber: z.string().nullable().optional().describe('Attendee phone number'),
  isGroupSession: z.boolean().optional().describe('Whether the event is a group session'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
});

export let eventAttendeeTrigger = SlateTrigger.create(spec, {
  name: 'Event Attendee Changes',
  key: 'event_attendee',
  description:
    'Triggers when an attendee is added, cancels, or reschedules their participation in a SavvyCal event.'
})
  .input(
    z.object({
      webhookEventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Webhook payload ID'),
      occurredAt: z.string().describe('When the event occurred'),
      eventPayload: z.any().describe('Raw event payload')
    })
  )
  .output(attendeeEventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({ url: ctx.input.webhookBaseUrl });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let attendeeTypes = [
        'event.attendee.added',
        'event.attendee.canceled',
        'event.attendee.rescheduled'
      ];

      if (!attendeeTypes.includes(data.type)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookEventType: data.type,
            webhookEventId: data.id,
            occurredAt: data.occurred_at,
            eventPayload: data.payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let e = ctx.input.eventPayload;

      // The payload may contain event-level info plus the specific attendee
      // The attendee info could be at the top level or nested
      let attendee = e.attendee ?? e.scheduler ?? e;

      return {
        type: ctx.input.webhookEventType,
        id: ctx.input.webhookEventId,
        output: {
          eventId: e.event_id ?? e.id,
          summary: e.summary,
          startAt: e.start_at,
          endAt: e.end_at,
          attendeeId: attendee.id ?? e.id,
          attendeeName: attendee.display_name ?? attendee.name,
          attendeeEmail: attendee.email,
          attendeeFirstName: attendee.first_name,
          attendeeLastName: attendee.last_name,
          attendeeTimeZone: attendee.time_zone,
          attendeePhoneNumber: attendee.phone_number,
          isGroupSession: e.is_group_session,
          metadata: e.metadata
        }
      };
    }
  })
  .build();
