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
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Omit page and keep any supplied filters and page size unchanged.'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      nextLink: z
        .string()
        .optional()
        .describe('Exact provider continuation; pass as nextPage to this tool.'),
      previousLink: z.string().optional(),
      hasMore: z.boolean().optional(),
      totalCount: z.number().optional().describe('Total number of orders'),
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
    let client = new ShippoClient(ctx.auth);

    let result = await client.listOrders({
      nextPage: ctx.input.nextPage,
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let orders = result.results.map(o => ({
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
        nextLink: result.next,
        previousLink: result.previous,
        hasMore: !!result.next,
        orders
      },
      message: `Retrieved this page of orders. Showing ${orders.length} on this page.`
    };
  })
  .build();
