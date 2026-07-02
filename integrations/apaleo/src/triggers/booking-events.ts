import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description:
    'Triggers on booking lifecycle events: created, changed, deleted, and payment account set. A booking groups one or more reservations.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of booking event'),
      eventId: z.string().describe('Unique event ID'),
      bookingId: z.string().describe('Booking ID'),
      propertyId: z.string().optional().describe('Property ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      payload: z.any().optional()
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('Affected booking ID'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['Booking/*']
      });
      return { registrationDetails: { subscriptionId: result.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      await webhookClient.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events
        .filter((e: any) => e.topic?.startsWith('Booking'))
        .map((e: any) => ({
          eventType: e.type || e.topic || 'unknown',
          eventId: e.id || `${e.topic}-${e.entityId}-${e.timestamp}`,
          bookingId: e.entityId || '',
          propertyId: e.propertyId,
          timestamp: e.timestamp,
          payload: e
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType
        .replace('Booking/', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `booking.${eventType}`,
        id: ctx.input.eventId,
        output: {
          bookingId: ctx.input.bookingId,
          propertyId: ctx.input.propertyId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
