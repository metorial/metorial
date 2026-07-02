import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let carrierConnectedTrigger = SlateTrigger.create(spec, {
  name: 'Carrier Connected',
  key: 'carrier_connected',
  description: 'Fires when a new carrier account is connected to your ShipEngine account.'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the carrier resource'),
      carrierId: z.string().describe('Carrier ID'),
      carrierCode: z.string().optional().describe('Carrier code'),
      nickname: z.string().optional().describe('Carrier nickname'),
      friendlyName: z.string().optional().describe('Carrier friendly name')
    })
  )
  .output(
    z.object({
      carrierId: z.string().describe('Carrier ID'),
      carrierCode: z.string().describe('Carrier code'),
      nickname: z.string().describe('Carrier nickname'),
      friendlyName: z.string().describe('Carrier friendly name'),
      accountNumber: z.string().optional().describe('Account number'),
      balance: z.number().optional().describe('Account balance')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'carrier_connected',
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

      let carrierData = data?.data ?? data ?? {};

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            carrierId: carrierData.carrier_id ?? '',
            carrierCode: carrierData.carrier_code,
            nickname: carrierData.nickname,
            friendlyName: carrierData.friendly_name
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let carrier: any;
      try {
        carrier = await client.getCarrier(ctx.input.carrierId);
      } catch {
        carrier = null;
      }

      return {
        type: 'carrier.connected',
        id: `carrier-connected-${ctx.input.carrierId}-${Date.now()}`,
        output: {
          carrierId: ctx.input.carrierId,
          carrierCode: carrier?.carrier_code ?? ctx.input.carrierCode ?? '',
          nickname: carrier?.nickname ?? ctx.input.nickname ?? '',
          friendlyName: carrier?.friendly_name ?? ctx.input.friendlyName ?? '',
          accountNumber: carrier?.account_number,
          balance: carrier?.balance
        }
      };
    }
  })
  .build();
