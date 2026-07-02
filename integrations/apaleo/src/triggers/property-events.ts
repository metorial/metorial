import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApaleoWebhookClient } from '../lib/client';
import { spec } from '../spec';

export let propertyEvents = SlateTrigger.create(spec, {
  name: 'Property & Unit Events',
  key: 'property_events',
  description:
    'Triggers on property, unit, unit group, and maintenance events: created, changed, deleted, set to live, archived, and more.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event'),
      eventId: z.string().describe('Unique event ID'),
      entityId: z
        .string()
        .describe('Entity ID (property, unit, unit group, or maintenance ID)'),
      entityType: z
        .string()
        .describe('Type of entity (Property, Unit, UnitGroup, Maintenance)'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional(),
      payload: z.any().optional()
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('Affected entity ID'),
      entityType: z.string().describe('Type of entity'),
      propertyId: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new ApaleoWebhookClient(ctx.auth.token);
      let result = await webhookClient.createSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: [
          'Property/*',
          'Unit/*',
          'UnitGroup/*',
          'Maintenance/*',
          'UnitAttributeDefinition/*'
        ]
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

      let topicPrefixes = [
        'Property',
        'Unit',
        'UnitGroup',
        'Maintenance',
        'UnitAttributeDefinition'
      ];
      let inputs = events
        .filter((e: any) => topicPrefixes.some(p => e.topic?.startsWith(p)))
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

      let prefix = ctx.input.entityType
        .toLowerCase()
        .replace(/([A-Z])/g, '_$1')
        .replace(/^_/, '');

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
