import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let BOOKING_TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'BOOKING_REQUESTED',
  'BOOKING_REJECTED',
  'BOOKING_NO_SHOW_UPDATED',
  'BOOKING_PAYMENT_INITIATED',
  'BOOKING_PAID'
] as const;

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description:
    'Triggers when a booking is created, rescheduled, cancelled, requested, rejected, has its no-show status updated, or when a payment is initiated or completed.'
})
  .input(
    z.object({
      triggerEvent: z.string().describe('The trigger event type from Cal.com'),
      bookingUid: z.string().describe('UID of the booking'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      bookingUid: z.string().describe('UID of the booking'),
      title: z.string().optional().describe('Title of the booking'),
      startTime: z.string().optional().describe('Start time of the booking (ISO 8601)'),
      endTime: z.string().optional().describe('End time of the booking (ISO 8601)'),
      status: z.string().optional().describe('Booking status'),
      eventTypeId: z.number().optional().describe('ID of the event type'),
      organizerEmail: z.string().optional().describe('Email of the organizer'),
      organizerName: z.string().optional().describe('Name of the organizer'),
      attendees: z
        .array(
          z.object({
            email: z.string().optional(),
            name: z.string().optional(),
            timeZone: z.string().optional()
          })
        )
        .optional()
        .describe('List of attendees'),
      location: z.string().optional().describe('Meeting location or URL'),
      description: z.string().optional().describe('Booking description'),
      metadata: z.any().optional().describe('Booking metadata')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        subscriberUrl: ctx.input.webhookBaseUrl,
        triggers: [...BOOKING_TRIGGERS],
        active: true
      });

      return {
        registrationDetails: {
          webhookId: webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let triggerEvent = data.triggerEvent || '';
      let bookingUid = data.payload?.uid || data.payload?.bookingUid || data.uid || '';

      return {
        inputs: [
          {
            triggerEvent,
            bookingUid,
            payload: data.payload || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      let attendees = Array.isArray(p?.attendees)
        ? p.attendees.map((a: any) => ({
            email: a?.email,
            name: a?.name,
            timeZone: a?.timeZone
          }))
        : [];

      let typeMap: Record<string, string> = {
        BOOKING_CREATED: 'booking.created',
        BOOKING_RESCHEDULED: 'booking.rescheduled',
        BOOKING_CANCELLED: 'booking.cancelled',
        BOOKING_REQUESTED: 'booking.requested',
        BOOKING_REJECTED: 'booking.rejected',
        BOOKING_NO_SHOW_UPDATED: 'booking.no_show_updated',
        BOOKING_PAYMENT_INITIATED: 'booking.payment_initiated',
        BOOKING_PAID: 'booking.paid'
      };

      return {
        type:
          typeMap[ctx.input.triggerEvent] || `booking.${ctx.input.triggerEvent.toLowerCase()}`,
        id: `${ctx.input.triggerEvent}-${ctx.input.bookingUid}`,
        output: {
          bookingUid: ctx.input.bookingUid,
          title: p?.title,
          startTime: p?.startTime,
          endTime: p?.endTime,
          status: p?.status,
          eventTypeId: p?.eventTypeId,
          organizerEmail: p?.organizer?.email,
          organizerName: p?.organizer?.name,
          attendees,
          location: p?.location,
          description: p?.description,
          metadata: p?.metadata
        }
      };
    }
  })
  .build();
