import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let modelEvents = SlateTrigger.create(spec, {
  name: 'Model Events',
  key: 'model_events',
  description:
    'Triggers when content models are created, updated, or deleted. Field changes also trigger model update events.'
})
  .input(
    z.object({
      eventType: z.enum(['create', 'update', 'delete']).describe('Type of model event'),
      entity: z.any().describe('The model entity data'),
      previousEntity: z
        .any()
        .optional()
        .describe('Previous state of the model (for update events)'),
      relatedEntities: z.array(z.any()).optional().describe('Related entities'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      siteId: z.string().optional().describe('Project site ID'),
      webhookCallId: z.string().optional().describe('Unique webhook call identifier'),
      eventTriggeredAt: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('ID of the affected model'),
      modelName: z.string().optional().describe('Name of the model'),
      modelApiKey: z.string().optional().describe('API key of the model'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      model: z.any().describe('The model data'),
      previousModel: z.any().optional().describe('Previous model state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let webhook = await client.createWebhook({
        name: `Slates Model Events - ${Date.now()}`,
        url: ctx.input.webhookBaseUrl,
        headers: {},
        events: [
          {
            entity_type: 'item_type',
            event_types: ['create', 'update', 'delete']
          }
        ],
        enabled: true,
        payload_api_version: '3',
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

      if (!data || data.entity_type !== 'item_type') {
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

      return {
        type: `model.${ctx.input.eventType}`,
        id:
          ctx.input.webhookCallId ||
          `${entity.id}-${ctx.input.eventType}-${ctx.input.eventTriggeredAt || Date.now()}`,
        output: {
          modelId: entity.id || '',
          modelName: entity.name,
          modelApiKey: entity.api_key,
          environment: ctx.input.environment,
          model: entity,
          previousModel: ctx.input.previousEntity
        }
      };
    }
  })
  .build();
