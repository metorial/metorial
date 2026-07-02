import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeSchema = z.object({
  attendeeId: z.string().describe('Unique attendee identifier'),
  displayName: z.string().describe('Display name'),
  email: z.string().describe('Email address'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  isOrganizer: z.boolean().describe('Whether this is the organizer'),
  responseStatus: z.string().describe('Response status'),
  timeZone: z.string().describe('Time zone'),
  phoneNumber: z.string().nullable().optional().describe('Phone number')
});

let eventOutputSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  summary: z.string().describe('Event title'),
  description: z.string().nullable().optional().describe('Event description'),
  startAt: z.string().describe('Start time (ISO 8601)'),
  endAt: z.string().describe('End time (ISO 8601)'),
  duration: z.number().describe('Duration in minutes'),
  state: z.string().describe('Event state'),
  url: z.string().describe('Public event URL'),
  createdAt: z.string().describe('Creation timestamp'),
  attendees: z.array(attendeeSchema).describe('Event attendees'),
  organizer: attendeeSchema.nullable().optional().describe('Organizer'),
  scheduler: attendeeSchema.nullable().optional().describe('Scheduler'),
  conferencing: z
    .object({
      type: z.string().nullable().optional(),
      joinUrl: z.string().nullable().optional(),
      meetingId: z.string().nullable().optional()
    })
    .nullable()
    .optional()
    .describe('Conferencing info'),
  location: z.string().nullable().optional().describe('Location'),
  linkId: z.string().nullable().optional().describe('Scheduling link ID'),
  linkName: z.string().nullable().optional().describe('Scheduling link name'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
  isGroupSession: z.boolean().optional().describe('Whether this is a group session'),
  payment: z
    .object({
      amountTotal: z.number().optional(),
      state: z.string().optional(),
      url: z.string().nullable().optional()
    })
    .nullable()
    .optional()
    .describe('Payment details'),
  cancelReason: z.string().nullable().optional().describe('Cancellation reason'),
  canceledAt: z.string().nullable().optional().describe('Cancellation timestamp'),
  rescheduleReason: z.string().nullable().optional().describe('Reschedule reason'),
  rescheduledAt: z.string().nullable().optional().describe('Reschedule timestamp'),
  originalStartAt: z.string().nullable().optional().describe('Original start if rescheduled'),
  originalEndAt: z.string().nullable().optional().describe('Original end if rescheduled')
});

let mapAttendee = (a: any) =>
  a
    ? {
        attendeeId: a.id,
        displayName: a.display_name,
        email: a.email,
        firstName: a.first_name,
        lastName: a.last_name,
        isOrganizer: a.is_organizer,
        responseStatus: a.response_status,
        timeZone: a.time_zone,
        phoneNumber: a.phone_number
      }
    : null;

let mapEvent = (e: any) => ({
  eventId: e.id,
  summary: e.summary,
  description: e.description,
  startAt: e.start_at,
  endAt: e.end_at,
  duration: e.duration,
  state: e.state,
  url: e.url,
  createdAt: e.created_at,
  attendees: (e.attendees ?? []).map(mapAttendee),
  organizer: mapAttendee(e.organizer),
  scheduler: mapAttendee(e.scheduler),
  conferencing: e.conferencing
    ? {
        type: e.conferencing.type,
        joinUrl: e.conferencing.join_url,
        meetingId: e.conferencing.meeting_id
      }
    : null,
  location: e.location,
  linkId: e.link?.id,
  linkName: e.link?.name,
  metadata: e.metadata,
  isGroupSession: e.is_group_session,
  payment: e.payment
    ? {
        amountTotal: e.payment.amount_total,
        state: e.payment.state,
        url: e.payment.url
      }
    : null,
  cancelReason: e.cancel_reason,
  canceledAt: e.canceled_at,
  rescheduleReason: e.reschedule_reason,
  rescheduledAt: e.rescheduled_at,
  originalStartAt: e.original_start_at,
  originalEndAt: e.original_end_at
});

export let eventLifecycleTrigger = SlateTrigger.create(spec, {
  name: 'Event Lifecycle',
  key: 'event_lifecycle',
  description:
    'Triggers when an event is created, requested, approved, declined, rescheduled, changed, or canceled in SavvyCal.'
})
  .input(
    z.object({
      webhookEventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Webhook payload ID'),
      occurredAt: z.string().describe('When the event occurred'),
      eventPayload: z.any().describe('Raw event payload')
    })
  )
  .output(eventOutputSchema)
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

      let eventTypes = [
        'event.created',
        'event.requested',
        'event.approved',
        'event.declined',
        'event.rescheduled',
        'event.changed',
        'event.canceled'
      ];

      if (!eventTypes.includes(data.type)) {
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
      let event = mapEvent(ctx.input.eventPayload);

      return {
        type: ctx.input.webhookEventType,
        id: ctx.input.webhookEventId,
        output: event as any
      };
    }
  })
  .build();
