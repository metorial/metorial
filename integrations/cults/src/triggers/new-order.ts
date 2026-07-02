import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let orderLineSchema = z.object({
  downloadUrl: z.string().nullable().describe('Download URL'),
  creationIdentifier: z.string().nullable().describe('Creation identifier'),
  creationName: z.string().nullable().describe('Creation name'),
  creationUrl: z.string().nullable().describe('Creation URL')
});

export let newOrderTrigger = SlateTrigger.create(spec, {
  name: 'New Order',
  key: 'new_order',
  description:
    'Triggers when a new purchase order is recorded on your Cults3D account. Polls for recent orders and detects new ones since the last check.'
})
  .input(
    z.object({
      orderId: z.string().describe('Public order ID'),
      createdAt: z.string().nullable().describe('Order timestamp'),
      currency: z.string().nullable().describe('Order currency'),
      priceValue: z.number().nullable().describe('Total price'),
      lines: z.array(orderLineSchema).describe('Order line items')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Public order ID'),
      createdAt: z.string().nullable().describe('Order timestamp (ISO-8601)'),
      currency: z.string().nullable().describe('Currency of the order'),
      priceValue: z.number().nullable().describe('Total price of the order'),
      lines: z.array(orderLineSchema).describe('Items in the order')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CultsClient({
        token: ctx.auth.token,
        username: ctx.auth.username
      });

      let lastSeenOrderId: string | null = ctx.state?.lastSeenOrderId ?? null;

      let result = await client.getMyOrders({
        limit: 20,
        offset: 0
      });

      let orders = result.results;

      let newOrders: any[] = [];
      for (let order of orders) {
        if (order.publicId === lastSeenOrderId) {
          break;
        }
        newOrders.push(order);
      }

      let inputs = newOrders.map((o: any) => ({
        orderId: o.publicId,
        createdAt: o.createdAt,
        currency: o.price?.currency ?? null,
        priceValue: o.price?.value ?? null,
        lines: (o.lines ?? []).map((l: any) => ({
          downloadUrl: l.downloadUrl,
          creationIdentifier: l.creation?.identifier ?? null,
          creationName: l.creation?.name ?? null,
          creationUrl: l.creation?.url ?? null
        }))
      }));

      let updatedState = {
        lastSeenOrderId: orders.length > 0 ? orders[0].publicId : lastSeenOrderId
      };

      return {
        inputs,
        updatedState
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order.created',
        id: ctx.input.orderId,
        output: {
          orderId: ctx.input.orderId,
          createdAt: ctx.input.createdAt,
          currency: ctx.input.currency,
          priceValue: ctx.input.priceValue,
          lines: ctx.input.lines
        }
      };
    }
  })
  .build();
