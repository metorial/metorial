import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let blockEvents = SlateTrigger.create(spec, {
  name: 'Block & Group Events',
  key: 'block_events',
  description:
    'Triggers on block and group lifecycle events: created, changed, deleted, confirmed, released, washed, or cancelled.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event ID'),
      entityId: z.string().describe('Block or group ID'),
      entityType: z.string().describe('Entity type (Block or Group)'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional(),
      payload: z.any().optional()
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('Affected block or group ID'),
      entityType: z.string().describe('Block or Group'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['Block/*', 'Group/*']
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
        .filter((e: any) => e.topic?.startsWith('Block') || e.topic?.startsWith('Group'))
        .map((e: any) => {
          let entityType = (e.topic || '').split('/')[0] || 'Unknown';
          return {
            eventType: e.type || e.topic || 'unknown',
            eventId: e.id || `${e.topic}-${e.entityId}-${e.timestamp}`,
            entityId: e.entityId || '',
            entityType,
            propertyId: e.propertyId,
            timestamp: e.timestamp,
            payload: e
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      let topicPart = ctx.input.eventType.includes('/')
        ? ctx.input.eventType.split('/').pop() || ''
        : ctx.input.eventType;

      let eventType = topicPart
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      let prefix = ctx.input.entityType.toLowerCase();

      return {
        type: `${prefix}.${eventType}`,
        id: ctx.input.eventId,
        output: {
          entityId: ctx.input.entityId,
          entityType: ctx.input.entityType,
          propertyId: ctx.input.propertyId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
