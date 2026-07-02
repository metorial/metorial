import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `List orders placed through a site's e-commerce functionality. Returns order details including customer info, items, and totals.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteSlug: z.string().describe('Site slug to retrieve orders for'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)')
    })
  )
  .output(
    z.object({
      orders: z.array(
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
              priceInCents: z.number(),
              originalPriceInCents: z.number(),
              taxInCents: z.number()
            })
          ),
          createdAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listOrders({
      site: ctx.input.siteSlug,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let orders = result.items.map(event => ({
      orderId: event.data.id,
      orderNumber: event.data.orderNumber,
      status: event.data.status,
      totalInCents: event.data.totalInCents,
      currency: event.data.currency,
      customerName: event.data.customerName,
      customerEmail: event.data.customerEmail,
      siteId: event.data.siteId,
      orderItems: event.data.orderItems.map(item => ({
        orderItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        priceInCents: item.priceInCents,
        originalPriceInCents: item.originalPriceInCents,
        taxInCents: item.taxInCents
      })),
      createdAt: event.data.createdAt
    }));

    return {
      output: {
        orders,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** order(s). Returned ${orders.length} on this page.`
    };
  })
  .build();
