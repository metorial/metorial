import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve a paginated list of all orders in your Shippo account. Use this to browse orders for shipping management.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of orders'),
      orders: z.array(
        z.object({
          orderId: z.string(),
          orderNumber: z.string().optional(),
          orderStatus: z.string().optional(),
          placedAt: z.string().optional(),
          totalPrice: z.string().optional(),
          currency: z.string().optional(),
          shippingMethod: z.string().optional(),
          toAddressName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = await client.listOrders({
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let orders = result.results.map((o: any) => ({
      orderId: o.object_id,
      orderNumber: o.order_number,
      orderStatus: o.order_status,
      placedAt: o.placed_at,
      totalPrice: o.total_price,
      currency: o.currency,
      shippingMethod: o.shipping_method,
      toAddressName: o.to_address?.name
    }));

    return {
      output: {
        totalCount: result.count,
        orders
      },
      message: `Found **${result.count}** orders. Showing ${orders.length} on this page.`
    };
  })
  .build();
