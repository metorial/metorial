import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let clientTrigger = SlateTrigger.create(spec, {
  name: 'New Client',
  key: 'new_client',
  description: 'Triggers when a new client is created in Project Bubble.'
})
  .input(
    z.object({
      resourceUrl: z.string().describe('URL to the client resource')
    })
  )
  .output(
    z.object({
      clientId: z.string().describe('Client ID'),
      clientName: z.string().optional().describe('Client name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.subscribeWebhook(ctx.input.webhookBaseUrl, 'new_client');
      let subscriptionId = String(
        result?.id || result?.data?.id || result?.subscription_id || ''
      );

      return {
        registrationDetails: { subscriptionId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      await client.unsubscribeWebhook(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            resourceUrl: data.resource_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.fetchResourceByUrl(ctx.input.resourceUrl);
      let c = result?.data?.[0] || result?.data || result;

      return {
        type: 'client.created',
        id: String(c.client_id || ctx.input.resourceUrl),
        output: {
          clientId: String(c.client_id || ''),
          clientName: c.client_name || c.name || undefined
        }
      };
    }
  })
  .build();
