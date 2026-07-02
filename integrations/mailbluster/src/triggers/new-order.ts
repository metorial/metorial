import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newOrder = SlateTrigger.create(spec, {
  name: 'New Order',
  key: 'new_order',
  description: 'Triggers when a new order is created in MailBluster.'
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the new order'),
      customerEmail: z.string().describe('Customer email address'),
      campaignId: z.string().nullable().describe('Attributed campaign ID'),
      currency: z.string().describe('Currency code'),
      totalPrice: z.number().describe('Total price of the order'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the order'),
      customerEmail: z.string().describe('Customer email address'),
      campaignId: z.string().nullable().describe('Attributed campaign ID'),
      currency: z.string().describe('Currency code'),
      totalPrice: z.number().describe('Total price of the order'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let orders = await client.listOrders();
      let seenIds: string[] = ctx.input.state?.seenIds || [];
      let seenSet = new Set(seenIds);

      let newOrders = orders.filter(o => !seenSet.has(o.id));

      let updatedSeenIds = orders.map(o => o.id);

      return {
        inputs: newOrders.map(o => ({
          orderId: o.id,
          customerEmail: o.customer?.email || '',
          campaignId: o.campaignId,
          currency: o.currency,
          totalPrice: o.totalPrice,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt
        })),
        updatedState: {
          seenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order.created',
        id: ctx.input.orderId,
        output: {
          orderId: ctx.input.orderId,
          customerEmail: ctx.input.customerEmail,
          campaignId: ctx.input.campaignId,
          currency: ctx.input.currency,
          totalPrice: ctx.input.totalPrice,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
