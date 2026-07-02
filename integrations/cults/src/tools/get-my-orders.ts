import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let orderLineSchema = z.object({
  downloadUrl: z.string().nullable().describe('Download URL for the purchased file'),
  creationIdentifier: z.string().nullable().describe('Identifier of the purchased creation'),
  creationName: z.string().nullable().describe('Name of the purchased creation'),
  creationUrl: z.string().nullable().describe('URL of the purchased creation')
});

let orderSchema = z.object({
  orderId: z.string().describe('Public order ID'),
  createdAt: z.string().nullable().describe('Order timestamp (ISO-8601)'),
  currency: z.string().nullable().describe('Currency of the order'),
  priceValue: z.number().nullable().describe('Total price value'),
  lines: z.array(orderLineSchema).describe('Items in the order')
});

export let getMyOrders = SlateTool.create(spec, {
  name: 'Get My Orders',
  key: 'get_my_orders',
  description: `Retrieve your purchase history on Cults3D. Returns orders with pricing, purchased items, and download URLs for files you have bought. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of orders to return (default 20)'),
      offset: z.number().min(0).optional().describe('Number of orders to skip for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of orders'),
      orders: z.array(orderSchema).describe('List of order records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.getMyOrders({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let orders = result.results.map((o: any) => ({
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

    return {
      output: {
        total: result.total,
        orders
      },
      message: `Found **${result.total}** total orders. Returned ${orders.length} order records.`
    };
  })
  .build();
