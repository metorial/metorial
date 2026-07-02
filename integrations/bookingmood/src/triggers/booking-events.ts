import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description: 'Triggers when a booking is created or updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type: bookings.created or bookings.updated'),
      bookingNew: z.any().describe('New booking data'),
      bookingOld: z
        .any()
        .nullable()
        .describe('Previous booking data (null for created events)')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('UUID of the booking'),
      organizationId: z.string().describe('UUID of the organization'),
      reference: z.string().describe('Public-facing booking reference'),
      method: z.string().describe('Creation method: request or book'),
      currency: z.string().describe('Booking currency'),
      confirmedAt: z.string().nullable().describe('Confirmation timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: ['bookings.created', 'bookings.updated'],
        description: 'Slates: Booking Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            bookingNew: data.payload?.new ?? null,
            bookingOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let booking = ctx.input.bookingNew;
      let eventType = ctx.input.eventType;

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          bookingId: booking.id,
          organizationId: booking.organization_id,
          reference: booking.reference,
          method: booking.method,
          currency: booking.currency,
          confirmedAt: booking.confirmed_at ?? null,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at
        }
      };
    }
  })
  .build();
