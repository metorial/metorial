import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let payoutEvents = SlateTrigger.create(spec, {
  name: 'Payout Events',
  key: 'payout_events',
  description:
    'Triggers when payout status changes occur, including approval, completion, and cancellation.'
})
  .input(
    z.object({
      eventType: z.string().describe('BTCPay Server payout event type'),
      deliveryId: z.string().describe('Webhook delivery ID'),
      payoutId: z.string().describe('Payout ID'),
      storeId: z.string().describe('Store ID'),
      pullPaymentId: z.string().optional().nullable().describe('Associated pull payment ID'),
      paymentMethod: z.string().optional().nullable().describe('Payment method'),
      destination: z.string().optional().nullable().describe('Payout destination'),
      amount: z.string().optional().nullable().describe('Payout amount'),
      timestamp: z.number().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      payoutId: z.string().describe('Payout ID'),
      storeId: z.string().describe('Store ID'),
      state: z.string().describe('Payout state derived from event'),
      pullPaymentId: z.string().optional().nullable().describe('Associated pull payment ID'),
      paymentMethod: z.string().optional().nullable().describe('Payment method'),
      destination: z.string().optional().nullable().describe('Payout destination address'),
      amount: z.string().optional().nullable().describe('Payout amount'),
      timestamp: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BTCPayClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let stores = await client.getStores();

      let registrations: Array<{ storeId: string; webhookId: string }> = [];

      for (let store of stores) {
        let storeId = store.id as string;
        let result = await client.createWebhook(storeId, {
          url: ctx.input.webhookBaseUrl,
          enabled: true,
          authorizedEvents: {
            everything: true
          }
        });

        registrations.push({
          storeId,
          webhookId: result.id as string
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BTCPayClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let registrations = (ctx.input.registrationDetails as Record<string, unknown>)
        .registrations as Array<{ storeId: string; webhookId: string }>;

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.storeId, reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      if (!body?.type) {
        return { inputs: [] };
      }

      let eventType = body.type as string;

      // Only process payout events (filter out invoice events)
      if (!eventType.startsWith('Payout') && !eventType.includes('payout')) {
        return { inputs: [] };
      }

      let deliveryId =
        (body.deliveryId as string) ||
        (body.webhookId as string) ||
        `${body.payoutId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            deliveryId: String(deliveryId),
            payoutId: (body.payoutId as string) || '',
            storeId: (body.storeId as string) || '',
            pullPaymentId: (body.pullPaymentId as string) || null,
            paymentMethod: (body.paymentMethod as string) || null,
            destination: (body.destination as string) || null,
            amount: (body.amount as string) || null,
            timestamp: body.timestamp as number | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let stateMap: Record<string, string> = {
        PayoutApproved: 'Approved',
        PayoutCompleted: 'Completed',
        PayoutCreated: 'AwaitingApproval',
        PayoutCancelled: 'Cancelled'
      };

      let state = stateMap[ctx.input.eventType] || ctx.input.eventType;
      let typeKey = ctx.input.eventType
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `payout.${typeKey}`,
        id: ctx.input.deliveryId,
        output: {
          payoutId: ctx.input.payoutId,
          storeId: ctx.input.storeId,
          state,
          pullPaymentId: ctx.input.pullPaymentId,
          paymentMethod: ctx.input.paymentMethod,
          destination: ctx.input.destination,
          amount: ctx.input.amount,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
