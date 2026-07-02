import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Lists all orders in your MailBluster brand. Returns an array of orders with customer info, items, pricing, and campaign attribution.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNo: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of orders per page')
    })
  )
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.string().describe('ID of the order'),
            customerEmail: z.string().describe('Customer email address'),
            campaignId: z.string().nullable().describe('Attributed campaign ID'),
            currency: z.string().describe('Currency code'),
            totalPrice: z.number().describe('Total price'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let orders = await client.listOrders(ctx.input.pageNo, ctx.input.perPage);

    let mappedOrders = (Array.isArray(orders) ? orders : []).map(o => ({
      orderId: o.id,
      customerEmail: o.customer?.email || '',
      campaignId: o.campaignId,
      currency: o.currency,
      totalPrice: o.totalPrice,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }));

    return {
      output: {
        orders: mappedOrders
      },
      message: `Retrieved **${mappedOrders.length}** order(s).`
    };
  })
  .build();
