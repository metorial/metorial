import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rateUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Rate Updated',
  key: 'rate_updated',
  description: 'Fires when a shipment rate has been updated.'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the rate resource'),
      shipmentId: z.string().optional().describe('Shipment ID'),
      rateRequestId: z.string().optional().describe('Rate request ID'),
      status: z.string().optional().describe('Rate status'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      shipmentId: z.string().describe('Shipment ID'),
      rateRequestId: z.string().optional().describe('Rate request ID'),
      status: z.string().describe('Rate status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'rate',
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

      let rateData = data?.data ?? data ?? {};

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            shipmentId: rateData.shipment_id ?? '',
            rateRequestId: rateData.rate_request_id,
            status: rateData.status ?? 'updated',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'rate.updated',
        id: `rate-${ctx.input.shipmentId}-${ctx.input.rateRequestId ?? ''}-${Date.now()}`,
        output: {
          shipmentId: ctx.input.shipmentId ?? '',
          rateRequestId: ctx.input.rateRequestId,
          status: ctx.input.status ?? 'updated'
        }
      };
    }
  })
  .build();
