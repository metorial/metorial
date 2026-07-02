import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description: 'Triggers when a new order is placed through a site.'
})
  .input(
    z.object({
      eventType: z.literal('order.created'),
      eventId: z.string(),
      timestamp: z.number(),
      order: z.any()
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      orderNumber: z.number(),
      status: z.string(),
      totalInCents: z.number(),
      currency: z.string(),
      customerName: z.string(),
      customerEmail: z.string(),
      siteId: z.string(),
      orderItems: z.array(
        z.object({
          orderItemId: z.string(),
          name: z.string(),
          quantity: z.number(),
          priceInCents: z.number()
        })
      ),
      createdAt: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let result = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { eventType: 'order.created' }
      ]);

      return {
        registrationDetails: { webhookId: result.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        id: string;
        created: number;
        type: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: 'order.created' as const,
            eventId: data.id,
            timestamp: data.created,
            order: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let order = ctx.input.order;

      return {
        type: 'order.created',
        id: ctx.input.eventId,
        output: {
          orderId: order.id ?? ctx.input.eventId,
          orderNumber: order.orderNumber ?? 0,
          status: order.status ?? 'UNKNOWN',
          totalInCents: order.totalInCents ?? 0,
          currency: order.currency ?? 'USD',
          customerName: order.customerName ?? '',
          customerEmail: order.customerEmail ?? '',
          siteId: order.siteId ?? '',
          orderItems: (order.orderItems ?? []).map((item: any) => ({
            orderItemId: item.id ?? '',
            name: item.name ?? '',
            quantity: item.quantity ?? 0,
            priceInCents: item.priceInCents ?? 0
          })),
          createdAt: order.createdAt ?? ''
        }
      };
    }
  })
  .build();
