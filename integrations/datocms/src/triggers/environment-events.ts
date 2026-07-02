import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let environmentEvents = SlateTrigger.create(spec, {
  name: 'Environment Events',
  key: 'environment_events',
  description:
    'Triggers when environment-related deployment operations start, succeed, or fail.'
})
  .input(
    z.object({
      eventType: z
        .enum(['deploy_started', 'deploy_succeeded', 'deploy_failed'])
        .describe('Type of environment event'),
      entity: z.any().describe('The environment entity data'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      siteId: z.string().optional().describe('Project site ID'),
      webhookCallId: z.string().optional().describe('Unique webhook call identifier'),
      eventTriggeredAt: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .output(
    z.object({
      environmentId: z.string().describe('ID of the affected environment'),
      status: z.string().describe('Environment deploy status'),
      environment: z.string().optional().describe('Environment name'),
      environmentData: z.any().describe('The environment entity data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let webhook = await client.createWebhook({
        name: `Slates Environment Events - ${Date.now()}`,
        url: ctx.input.webhookBaseUrl,
        headers: {},
        events: [
          {
            entity_type: 'environment',
            event_types: ['deploy_started', 'deploy_succeeded', 'deploy_failed']
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

      if (!data || data.entity_type !== 'environment') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            entity: data.entity,
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
        type: `environment.${ctx.input.eventType}`,
        id:
          ctx.input.webhookCallId ||
          `${entity.id}-${ctx.input.eventType}-${ctx.input.eventTriggeredAt || Date.now()}`,
        output: {
          environmentId: entity.id || '',
          status: ctx.input.eventType,
          environment: ctx.input.environment,
          environmentData: entity
        }
      };
    }
  })
  .build();
