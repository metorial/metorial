import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let nightAuditEvents = SlateTrigger.create(spec, {
  name: 'Night Audit Events',
  key: 'night_audit_events',
  description: 'Triggers when a night audit starts, succeeds, or fails for a property.'
})
  .input(
    z.object({
      eventType: z.string().describe('Night audit event type (started, succeeded, failed)'),
      eventId: z.string().describe('Unique event ID'),
      propertyId: z.string().describe('Property ID'),
      timestamp: z.string().optional(),
      payload: z.any().optional()
    })
  )
  .output(
    z.object({
      propertyId: z.string().describe('Property ID'),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['NightAudit/*']
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
        .filter((e: any) => e.topic?.startsWith('NightAudit'))
        .map((e: any) => ({
          eventType: e.type || e.topic || 'unknown',
          eventId: e.id || `${e.topic}-${e.entityId}-${e.timestamp}`,
          propertyId: e.entityId || e.propertyId || '',
          timestamp: e.timestamp,
          payload: e
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType
        .replace('NightAudit/', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `night_audit.${eventType}`,
        id: ctx.input.eventId,
        output: {
          propertyId: ctx.input.propertyId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
