import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderSourceRefreshTrigger = SlateTrigger.create(spec, {
  name: 'Order Source Refresh Complete',
  key: 'order_source_refresh_complete',
  description:
    'Fires when a connected order source (e.g., a marketplace) has completed a refresh of its orders.'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the order source resource'),
      orderSourceId: z.string().optional().describe('Order source ID'),
      orderSourceName: z.string().optional().describe('Order source name'),
      status: z.string().optional().describe('Refresh status'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      orderSourceId: z.string().describe('Order source ID'),
      orderSourceName: z.string().optional().describe('Order source name'),
      status: z.string().describe('Refresh status'),
      resourceUrl: z.string().optional().describe('URL to the order source resource')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'order_source_refresh_complete',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let sourceData = data?.data ?? data ?? {};

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            orderSourceId: sourceData.order_source_id ?? sourceData.id ?? '',
            orderSourceName: sourceData.order_source_name ?? sourceData.name,
            status: sourceData.status ?? 'complete',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order_source.refresh_complete',
        id: `order-source-refresh-${ctx.input.orderSourceId ?? ''}-${Date.now()}`,
        output: {
          orderSourceId: ctx.input.orderSourceId ?? '',
          orderSourceName: ctx.input.orderSourceName,
          status: ctx.input.status ?? 'complete',
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
