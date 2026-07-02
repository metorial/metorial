import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let schemaEvents = SlateTrigger.create(spec, {
  name: 'Schema Events',
  key: 'schema_events',
  description: 'Triggers when a credential schema is created.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of schema event'),
      webhookPayload: z.any().describe('Raw webhook payload from Truvera')
    })
  )
  .output(
    z.object({
      schemaId: z.string().optional().describe('ID of the created schema'),
      schemaName: z.string().optional().describe('Name of the schema'),
      schemaData: z.any().optional().describe('Additional schema data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: ['schema_create'],
        description: 'Slates schema events webhook',
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

      return {
        type: 'schema.created',
        id: data?.id || `schema_create-${Date.now()}`,
        output: {
          schemaId: data?.id,
          schemaName: data?.name || data?.schema?.name,
          schemaData: data
        }
      };
    }
  })
  .build();
