import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let REGISTRY_EVENTS = ['registry_create', 'registry_delete'] as const;

export let registryEvents = SlateTrigger.create(spec, {
  name: 'Registry Events',
  key: 'registry_events',
  description: 'Triggers when a revocation registry is created or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of registry event'),
      webhookPayload: z.any().describe('Raw webhook payload from Truvera')
    })
  )
  .output(
    z.object({
      registryId: z.string().optional().describe('ID of the affected registry'),
      registryType: z.string().optional().describe('Type of the registry'),
      policy: z.array(z.string()).optional().describe('Controlling DIDs'),
      registryData: z.any().optional().describe('Additional registry data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...REGISTRY_EVENTS],
        description: 'Slates registry events webhook',
        status: 1
      });

      return {
        registrationDetails: {
          webhookId: result?.id,
          secret: result?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.event || 'unknown',
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let data = payload?.data || {};

      let eventType = ctx.input.eventType;
      let eventTypeFormatted = eventType.replace('_', '.');

      return {
        type: eventTypeFormatted,
        id: data?.id || `${eventType}-${Date.now()}`,
        output: {
          registryId: data?.id,
          registryType: data?.type,
          policy: data?.policy,
          registryData: data
        }
      };
    }
  })
  .build();
