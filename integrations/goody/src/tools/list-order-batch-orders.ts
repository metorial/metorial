import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let orderSummarySchema = z.object({
  orderId: z.string().describe('Order ID'),
  status: z.string().describe('Order status'),
  giftLink: z.string().describe('Gift link URL'),
  recipientFirstName: z.string().describe('Recipient first name'),
  recipientLastName: z.string().nullable().describe('Recipient last name'),
  recipientEmail: z.string().nullable().describe('Recipient email'),
  isSwapped: z.boolean().describe('Whether the gift was swapped'),
  amountTotal: z.number().nullable().describe('Total cost in USD cents')
});

export let listOrderBatchOrders = SlateTool.create(spec, {
  name: 'List Order Batch Orders',
  key: 'list_order_batch_orders',
  description: `Paginate through all orders within a specific order batch. Useful for batches with more than 10 orders where the batch preview is incomplete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderBatchId: z.string().describe('ID of the order batch'),
      page: z.number().optional().describe('Page number for pagination, starting at 1'),
      perPage: z.number().optional().describe('Items per page (1-100, default 20)')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSummarySchema).describe('Orders in this batch'),
      totalCount: z.number().describe('Total number of orders in the batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.getOrderBatchOrders(ctx.input.orderBatchId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let orders = (result.data || []).map((o: any) => ({
      orderId: o.id,
      status: o.status,
      giftLink: o.individual_gift_link,
      recipientFirstName: o.recipient_first_name,
      recipientLastName: o.recipient_last_name,
      recipientEmail: o.recipient_email,
      isSwapped: o.is_swapped,
      amountTotal: o.amounts?.amount_total
    }));

    let totalCount = result.list_meta?.total_count || 0;

    return {
      output: { orders, totalCount },
      message: `Found **${totalCount}** orders in batch. Showing **${orders.length}** on this page.`
    };
  })
  .build();
