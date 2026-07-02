import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieves a specific order by its ID. Returns the order's customer info, items, pricing, and campaign attribution.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the order'),
      customerEmail: z.string().describe('Customer email address'),
      customerFirstName: z.string().nullable().describe('Customer first name'),
      customerLastName: z.string().nullable().describe('Customer last name'),
      campaignId: z.string().nullable().describe('Attributed campaign ID'),
      currency: z.string().describe('Currency code'),
      totalPrice: z.number().describe('Total price'),
      items: z
        .array(
          z.object({
            productId: z.string().describe('Product ID'),
            name: z.string().describe('Product name'),
            price: z.number().describe('Product price'),
            quantity: z.number().describe('Quantity')
          })
        )
        .describe('Order items'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let order = await client.getOrder(ctx.input.orderId);

    let mappedItems = (order.items || []).map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));

    return {
      output: {
        orderId: order.id,
        customerEmail: order.customer?.email || '',
        customerFirstName: order.customer?.firstName || null,
        customerLastName: order.customer?.lastName || null,
        campaignId: order.campaignId,
        currency: order.currency,
        totalPrice: order.totalPrice,
        items: mappedItems,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: `Retrieved order **${order.id}** — ${order.currency} ${order.totalPrice}.`
    };
  })
  .build();
