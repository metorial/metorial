import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers on invoice events: created, canceled, paid, written off, signed (fiscal), and rendered (fiscal).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of invoice event'),
      eventId: z.string().describe('Unique event ID'),
      invoiceId: z.string().describe('Invoice ID'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional(),
      payload: z.any().optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Affected invoice ID'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['Invoice/*']
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
        .filter((e: any) => e.topic?.startsWith('Invoice'))
        .map((e: any) => ({
          eventType: e.type || e.topic || 'unknown',
          eventId: e.id || `${e.topic}-${e.entityId}-${e.timestamp}`,
          invoiceId: e.entityId || '',
          propertyId: e.propertyId,
          timestamp: e.timestamp,
          payload: e
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType
        .replace('Invoice/', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `invoice.${eventType}`,
        id: ctx.input.eventId,
        output: {
          invoiceId: ctx.input.invoiceId,
          propertyId: ctx.input.propertyId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
