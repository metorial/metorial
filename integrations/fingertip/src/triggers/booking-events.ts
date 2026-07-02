import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description: 'Triggers when a booking is created, rescheduled, or cancelled.'
})
  .input(
    z.object({
      eventType: z.enum(['booking.created', 'booking.rescheduled', 'booking.cancelled']),
      eventId: z.string(),
      timestamp: z.number(),
      booking: z.any()
    })
  )
  .output(
    z.object({
      bookingId: z.string(),
      siteId: z.string().nullable(),
      eventTypeId: z.string().nullable(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      status: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      location: z.string().nullable(),
      attendees: z.any().nullable(),
      cancellationReason: z.string().nullable(),
      rescheduled: z.boolean().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let result = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { eventType: 'booking.created' },
        { eventType: 'booking.rescheduled' },
        { eventType: 'booking.cancelled' }
      ]);

      return {
        registrationDetails: { webhookId: result.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        id: string;
        created: number;
        type: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: data.type as
              | 'booking.created'
              | 'booking.rescheduled'
              | 'booking.cancelled',
            eventId: data.id,
            timestamp: data.created,
            booking: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let booking = ctx.input.booking;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          bookingId: booking.id ?? ctx.input.eventId,
          siteId: booking.siteId ?? null,
          eventTypeId: booking.eventTypeId ?? null,
          title: booking.title ?? null,
          description: booking.description ?? null,
          status: booking.status ?? 'UNKNOWN',
          startTime: booking.startTime ?? '',
          endTime: booking.endTime ?? '',
          location: booking.location ?? null,
          attendees: booking.attendees ?? null,
          cancellationReason: booking.cancellationReason ?? null,
          rescheduled: booking.rescheduled ?? null,
          createdAt: booking.createdAt ?? '',
          updatedAt: booking.updatedAt ?? ''
        }
      };
    }
  })
  .build();
