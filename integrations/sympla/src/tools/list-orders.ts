import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.string().describe('Unique order identifier'),
  eventId: z.number().describe('Associated event ID'),
  orderDate: z.string().describe('Order creation date'),
  orderStatus: z.string().describe('Order status'),
  updatedDate: z.string().describe('Last update date'),
  discountCode: z.string().describe('Discount code used, if any'),
  transactionType: z.string().describe('Transaction type'),
  totalSalePrice: z.number().describe('Total sale price of the order'),
  buyerFirstName: z.string().describe('Buyer first name'),
  buyerLastName: z.string().describe('Buyer last name'),
  buyerEmail: z.string().describe('Buyer email address')
});

export let listOrdersTool = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve a paginated list of orders (ticket purchases) for a specific event. Supports filtering by status and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID to list orders for'),
      includeAllStatuses: z
        .boolean()
        .optional()
        .describe(
          'If true, returns orders with any status. If false or omitted, returns only approved orders.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (1-200)'),
      fieldSort: z.string().optional().describe('Field to sort results by'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders'),
      hasNextPage: z.boolean().describe('Whether more pages are available'),
      totalQuantity: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listOrders(ctx.input.eventId, {
      status: ctx.input.includeAllStatuses,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      fieldSort: ctx.input.fieldSort,
      sort: ctx.input.sort
    });

    let orders = result.data.map(o => ({
      orderId: o.id ?? '',
      eventId: o.event_id ?? 0,
      orderDate: o.order_date ?? '',
      orderStatus: o.order_status ?? '',
      updatedDate: o.updated_date ?? '',
      discountCode: o.discount_code ?? '',
      transactionType: o.transaction_type ?? '',
      totalSalePrice: o.order_total_sale_price ?? 0,
      buyerFirstName: o.buyer_first_name ?? '',
      buyerLastName: o.buyer_last_name ?? '',
      buyerEmail: o.buyer_email ?? ''
    }));

    return {
      output: {
        orders,
        hasNextPage: result.pagination.hasNext,
        totalQuantity: result.pagination.quantity
      },
      message: `Found **${orders.length}** orders for event ${ctx.input.eventId}.${result.pagination.hasNext ? ' More pages available.' : ''}`
    };
  })
  .build();
