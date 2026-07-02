import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let buildEvents = SlateTrigger.create(spec, {
  name: 'Build Events',
  key: 'build_events',
  description:
    'Triggers when deployment builds start, succeed, or fail for configured build triggers.'
})
  .input(
    z.object({
      eventType: z
        .enum(['deploy_started', 'deploy_succeeded', 'deploy_failed'])
        .describe('Type of build event'),
      entity: z.any().describe('The build trigger entity data'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      siteId: z.string().optional().describe('Project site ID'),
      webhookCallId: z.string().optional().describe('Unique webhook call identifier'),
      eventTriggeredAt: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .output(
    z.object({
      buildTriggerId: z.string().describe('ID of the build trigger'),
      buildTriggerName: z.string().optional().describe('Name of the build trigger'),
      status: z
        .string()
        .describe('Build status (deploy_started, deploy_succeeded, deploy_failed)'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      buildTrigger: z.any().describe('The build trigger data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let webhook = await client.createWebhook({
        name: `Slates Build Events - ${Date.now()}`,
        url: ctx.input.webhookBaseUrl,
        headers: {},
        events: [
          {
            entity_type: 'build_trigger',
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

      if (!data || data.entity_type !== 'build_trigger') {
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
        type: `build_trigger.${ctx.input.eventType}`,
        id:
          ctx.input.webhookCallId ||
          `${entity.id}-${ctx.input.eventType}-${ctx.input.eventTriggeredAt || Date.now()}`,
        output: {
          buildTriggerId: entity.id || '',
          buildTriggerName: entity.name,
          status: ctx.input.eventType,
          environment: ctx.input.environment,
          buildTrigger: entity
        }
      };
    }
  })
  .build();
