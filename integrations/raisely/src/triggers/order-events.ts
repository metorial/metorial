import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers when an order (ticket purchase or product order) is created or succeeded.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of order event (created or succeeded)'),
      orderUuid: z.string().describe('UUID of the order'),
      order: z
        .record(z.string(), z.any())
        .describe('Full order object from the webhook payload')
    })
  )
  .output(
    z.object({
      orderUuid: z.string().describe('UUID of the order'),
      campaignUuid: z.string().optional().describe('UUID of the campaign'),
      userUuid: z.string().optional().describe('UUID of the buyer'),
      status: z.string().optional().describe('Order status'),
      total: z.number().optional().describe('Order total in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      email: z.string().optional().describe('Buyer email address'),
      createdAt: z.string().optional().describe('When the order was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        campaignUuid: ctx.config.campaignUuid
      });
      let webhook = result.data || result;
      return { registrationDetails: { webhookUuid: webhook.uuid } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookUuid);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let type = String(data.type || '');
      if (!type.startsWith('order.')) {
        return { inputs: [] };
      }
      let eventType = type.replace('order.', '');
      let order = (data.data || {}) as Record<string, any>;
      return {
        inputs: [
          {
            eventType,
            orderUuid: String(order.uuid || data.uuid || ''),
            order
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let o = ctx.input.order as Record<string, any>;
      return {
        type: `order.${ctx.input.eventType}`,
        id: ctx.input.orderUuid,
        output: {
          orderUuid: String(o.uuid || ctx.input.orderUuid),
          campaignUuid: o.campaignUuid as string | undefined,
          userUuid: o.userUuid as string | undefined,
          status: o.status as string | undefined,
          total: o.total as number | undefined,
          currency: o.currency as string | undefined,
          email: o.email as string | undefined,
          createdAt: o.createdAt as string | undefined
        }
      };
    }
  })
  .build();
