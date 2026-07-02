import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let folioEvents = SlateTrigger.create(spec, {
  name: 'Folio Events',
  key: 'folio_events',
  description:
    'Triggers on folio events: created, closed, reopened, balance changed, charges/payments/refunds posted, deposit items, and movements between folios.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of folio event'),
      eventId: z.string().describe('Unique event ID'),
      folioId: z.string().describe('Folio ID'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional(),
      payload: z.any().optional()
    })
  )
  .output(
    z.object({
      folioId: z.string().describe('Affected folio ID'),
      propertyId: z.string().optional(),
      reservationId: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['Folio/*']
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
        .filter((e: any) => e.topic?.startsWith('Folio'))
        .map((e: any) => ({
          eventType: e.type || e.topic || 'unknown',
          eventId: e.id || `${e.topic}-${e.entityId}-${e.timestamp}`,
          folioId: e.entityId || '',
          propertyId: e.propertyId,
          timestamp: e.timestamp,
          payload: e
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType
        .replace('Folio/', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `folio.${eventType}`,
        id: ctx.input.eventId,
        output: {
          folioId: ctx.input.folioId,
          propertyId: ctx.input.propertyId,
          reservationId: ctx.input.payload?.reservationId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
