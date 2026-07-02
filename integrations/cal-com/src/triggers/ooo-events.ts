import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let oooEvents = SlateTrigger.create(spec, {
  name: 'Out-of-Office Events',
  key: 'ooo_events',
  description: 'Triggers when an out-of-office entry is created for a user.'
})
  .input(
    z.object({
      triggerEvent: z.string().describe('The trigger event type from Cal.com'),
      oooId: z.string().describe('Identifier for the OOO entry'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      oooId: z.string().describe('Out-of-office entry identifier'),
      userId: z.number().optional().describe('ID of the user who is out of office'),
      startDate: z.string().optional().describe('Start date of the OOO period'),
      endDate: z.string().optional().describe('End date of the OOO period'),
      reason: z.string().optional().describe('Reason for being out of office')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        subscriberUrl: ctx.input.webhookBaseUrl,
        triggers: ['OOO_CREATED'],
        active: true
      });

      return {
        registrationDetails: {
          webhookId: webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let triggerEvent = data.triggerEvent || 'OOO_CREATED';
      let oooId =
        data.payload?.id?.toString() || data.payload?.uid || `${triggerEvent}-${Date.now()}`;

      return {
        inputs: [
          {
            triggerEvent,
            oooId,
            payload: data.payload || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: 'ooo.created',
        id: `OOO_CREATED-${ctx.input.oooId}`,
        output: {
          oooId: ctx.input.oooId,
          userId: p?.userId,
          startDate: p?.startDate || p?.start,
          endDate: p?.endDate || p?.end,
          reason: p?.reason || p?.notes
        }
      };
    }
  })
  .build();
