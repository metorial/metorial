import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let orderSummarySchema = z.object({
  orderId: z.string().describe('Unique order identifier'),
  status: z.string().describe('Current order status'),
  referenceId: z.string().describe('Display reference ID'),
  giftLink: z.string().describe('Gift link URL'),
  recipientFirstName: z.string().describe('Recipient first name'),
  recipientLastName: z.string().nullable().describe('Recipient last name'),
  recipientEmail: z.string().nullable().describe('Recipient email'),
  isSwapped: z.boolean().describe('Whether the gift was swapped'),
  orderBatchId: z.string().describe('Parent order batch ID'),
  amountTotal: z.number().nullable().describe('Total cost in USD cents')
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `List orders with pagination and optional date filters. Returns order summaries including status, recipient info, and costs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination, starting at 1'),
      perPage: z.number().optional().describe('Items per page (1-100, default 20)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter orders created at or after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter orders created at or before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSummarySchema).describe('List of orders'),
      totalCount: z.number().describe('Total number of orders available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listOrders({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      createdAtAfter: ctx.input.createdAfter,
      createdAtBefore: ctx.input.createdBefore
    });

    let orders = (result.data || []).map((o: any) => ({
      orderId: o.id,
      status: o.status,
      referenceId: o.reference_id,
      giftLink: o.individual_gift_link,
      recipientFirstName: o.recipient_first_name,
      recipientLastName: o.recipient_last_name,
      recipientEmail: o.recipient_email,
      isSwapped: o.is_swapped,
      orderBatchId: o.order_batch_id,
      amountTotal: o.amounts?.amount_total
    }));

    let totalCount = result.list_meta?.total_count || 0;

    return {
      output: { orders, totalCount },
      message: `Found **${totalCount}** orders. Showing **${orders.length}** on this page.`
    };
  })
  .build();
