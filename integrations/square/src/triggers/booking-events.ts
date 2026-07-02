import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let BOOKING_EVENT_TYPES = ['booking.created', 'booking.updated'];

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description: 'Triggered when bookings/appointments are created, updated, or canceled.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawBooking: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      bookingId: z.string().optional(),
      status: z.string().optional(),
      locationId: z.string().optional(),
      customerId: z.string().optional(),
      startAt: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Slates Booking Events',
          eventTypes: BOOKING_EVENT_TYPES,
          notificationUrl: ctx.input.webhookBaseUrl
        }
      });
      return { registrationDetails: { subscriptionId: subscription.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      if (!body?.type) return { inputs: [] };

      let booking = body.data?.object?.booking || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawBooking: booking
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let b = ctx.input.rawBooking as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          bookingId: b.id,
          status: b.status,
          locationId: b.location_id,
          customerId: b.customer_id,
          startAt: b.start_at,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          version: b.version
        }
      };
    }
  })
  .build();
