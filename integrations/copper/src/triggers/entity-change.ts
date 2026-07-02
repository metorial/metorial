import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let entityTypes = [
  'lead',
  'person',
  'company',
  'opportunity',
  'project',
  'task',
  'activity_log'
] as const;
let eventTypes = ['new', 'update', 'delete'] as const;

export let entityChange = SlateTrigger.create(spec, {
  name: 'Entity Change',
  key: 'entity_change',
  description:
    'Triggers when a CRM record is created, updated, or deleted. Supports all entity types: leads, people, companies, opportunities, projects, tasks, and activity logs.'
})
  .input(
    z.object({
      event: z.enum(eventTypes).describe('The event type: new, update, or delete'),
      entityType: z.enum(entityTypes).describe('The entity type that changed'),
      entityIds: z.array(z.number()).describe('IDs of the affected entities'),
      subscriptionId: z.number().describe('ID of the webhook subscription that fired'),
      updatedAttributes: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Changed fields (only present on update events)'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .output(
    z.object({
      entityType: z.enum(entityTypes).describe('Type of entity that changed'),
      entityIds: z.array(z.number()).describe('IDs of the affected entities'),
      event: z.enum(eventTypes).describe('What happened: new, update, or delete'),
      subscriptionId: z.number().describe('Webhook subscription ID'),
      updatedAttributes: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Changed fields with old and new values (update events only)'),
      timestamp: z.string().describe('When the event occurred (ISO 8601)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);

      let registeredWebhooks: Array<{ webhookId: number; type: string; event: string }> = [];

      for (let entityType of entityTypes) {
        for (let eventType of eventTypes) {
          try {
            let webhook = await client.createWebhook({
              target: ctx.input.webhookBaseUrl,
              type: entityType,
              event: eventType
            });
            registeredWebhooks.push({
              webhookId: webhook.id,
              type: entityType,
              event: eventType
            });
          } catch (_e) {
            // Some entity/event combinations may not be available
          }
        }
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number }>;
      };

      if (details?.webhooks) {
        for (let webhook of details.webhooks) {
          try {
            await client.deleteWebhook(webhook.webhookId);
          } catch (_e) {
            // Webhook may already be deleted
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            event: data.event,
            entityType: data.type,
            entityIds: data.ids || [],
            subscriptionId: data.subscription_id,
            updatedAttributes: data.updated_attributes || null,
            timestamp: data.timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = `${ctx.input.entityType}.${ctx.input.event}.${ctx.input.entityIds.join(',')}.${ctx.input.timestamp}`;

      return {
        type: `${ctx.input.entityType}.${ctx.input.event}`,
        id: eventId,
        output: {
          entityType: ctx.input.entityType,
          entityIds: ctx.input.entityIds,
          event: ctx.input.event,
          subscriptionId: ctx.input.subscriptionId,
          updatedAttributes: ctx.input.updatedAttributes,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
