import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordEvents = SlateTrigger.create(spec, {
  name: 'Record Events',
  key: 'record_events',
  description:
    'Triggers when content records are created, updated, deleted, published, or unpublished.'
})
  .input(
    z.object({
      eventType: z
        .enum(['create', 'update', 'delete', 'publish', 'unpublish'])
        .describe('Type of record event'),
      entity: z.any().describe('The record entity data'),
      previousEntity: z
        .any()
        .optional()
        .describe('Previous state of the record (for update events)'),
      relatedEntities: z
        .array(z.any())
        .optional()
        .describe('Related entities referenced by the record'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      siteId: z.string().optional().describe('Project site ID'),
      webhookCallId: z.string().optional().describe('Unique webhook call identifier'),
      eventTriggeredAt: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the affected record'),
      modelId: z.string().optional().describe('ID of the model this record belongs to'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      record: z.any().describe('The record data'),
      previousRecord: z.any().optional().describe('Previous record state (for update events)'),
      relatedEntities: z.array(z.any()).optional().describe('Related entities')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let webhook = await client.createWebhook({
        name: `Slates Record Events - ${Date.now()}`,
        url: ctx.input.webhookBaseUrl,
        headers: {},
        events: [
          {
            entity_type: 'item',
            event_types: ['create', 'update', 'delete', 'publish', 'unpublish']
          }
        ],
        enabled: true,
        payload_api_version: '3',
        nested_items_in_payload: false,
        auto_retry: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data || data.entity_type !== 'item') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            entity: data.entity,
            previousEntity: data.previous_entity,
            relatedEntities: data.related_entities,
            environment: data.environment,
            siteId: data.site_id,
            webhookCallId: data.webhook_call_id,
            eventTriggeredAt: data.event_triggered_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entity = ctx.input.entity || {};
      let modelRef = entity.item_type || {};

      return {
        type: `record.${ctx.input.eventType}`,
        id:
          ctx.input.webhookCallId ||
          `${entity.id}-${ctx.input.eventType}-${ctx.input.eventTriggeredAt || Date.now()}`,
        output: {
          recordId: entity.id || '',
          modelId: modelRef.id,
          environment: ctx.input.environment,
          record: entity,
          previousRecord: ctx.input.previousEntity,
          relatedEntities: ctx.input.relatedEntities
        }
      };
    }
  })
  .build();
