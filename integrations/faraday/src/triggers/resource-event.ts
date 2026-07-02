import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let resourceTypeEnum = z.enum([
  'accounts',
  'attributes',
  'cohorts',
  'connections',
  'datasets',
  'feature_stores',
  'market_opportunity_analyses',
  'outcomes',
  'persona_sets',
  'places',
  'recommenders',
  'scopes',
  'streams',
  'targets',
  'traits'
]);

export let resourceEvent = SlateTrigger.create(spec, {
  name: 'Resource Event',
  key: 'resource_event',
  description:
    'Triggered when a Faraday resource enters an error state or is successfully updated and ready. Covers all resource types including datasets, cohorts, outcomes, scopes, targets, and more.'
})
  .input(
    z.object({
      eventType: z
        .enum(['resource.errored', 'resource.ready_with_update'])
        .describe('Type of resource event'),
      resourceId: z.string().describe('UUID of the affected resource'),
      resourceType: resourceTypeEnum.describe('Type of the affected resource'),
      accountId: z.string().describe('UUID of the account')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('UUID of the affected resource'),
      resourceType: z
        .string()
        .describe('Type of the affected resource (e.g., scopes, outcomes, datasets)'),
      accountId: z.string().describe('UUID of the account')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FaradayClient({ token: ctx.auth.token });

      let webhook = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        enabled_events: ['resource.errored', 'resource.ready_with_update']
      });

      return {
        registrationDetails: {
          webhookEndpointId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FaradayClient({ token: ctx.auth.token });
      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      // Faraday webhook payloads include resource_id, resource_type, account_id, and event type
      let eventType = body.type || body.event_type;
      let resourceId = body.resource_id;
      let resourceType = body.resource_type;
      let accountId = body.account_id;

      if (!resourceId || !resourceType || !eventType) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            resourceId,
            resourceType,
            accountId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.resourceId}-${Date.now()}`,
        output: {
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          accountId: ctx.input.accountId
        }
      };
    }
  })
  .build();
