import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let reservationEvents = SlateTrigger.create(spec, {
  name: 'Reservation Events',
  key: 'reservation_events',
  description:
    'Triggers on reservation lifecycle events: created, amended, changed, checked-in, checked-out, canceled, no-show, unit assigned/unassigned, and more.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of reservation event'),
      eventId: z.string().describe('Unique event ID'),
      reservationId: z.string().describe('Reservation ID'),
      propertyId: z.string().optional().describe('Property ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      payload: z.any().optional().describe('Full event payload')
    })
  )
  .output(
    z.object({
      reservationId: z.string().describe('Affected reservation ID'),
      propertyId: z.string().optional().describe('Property ID'),
      bookingId: z.string().optional().describe('Booking ID'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);

      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['Reservation/*']
      });

      return {
        registrationDetails: {
          subscriptionId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      await webhookClient.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Apaleo sends events as an array or single event
      let events = Array.isArray(data) ? data : [data];

      let inputs = events
        .filter((e: any) => e.topic?.startsWith('Reservation'))
        .map((e: any) => ({
          eventType: e.type || e.topic || 'unknown',
          eventId: e.id || `${e.topic}-${e.entityId}-${e.timestamp}`,
          reservationId: e.entityId || '',
          propertyId: e.propertyId,
          timestamp: e.timestamp,
          payload: e
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType
        .replace('Reservation/', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `reservation.${eventType}`,
        id: ctx.input.eventId,
        output: {
          reservationId: ctx.input.reservationId,
          propertyId: ctx.input.propertyId,
          bookingId: ctx.input.payload?.bookingId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
