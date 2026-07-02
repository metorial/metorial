import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let orderBatchSummarySchema = z.object({
  orderBatchId: z.string().describe('Order batch ID'),
  sendStatus: z.string().describe('Batch status'),
  fromName: z.string().describe('Sender name'),
  ordersCount: z.number().describe('Number of orders in the batch'),
  sendMethod: z.string().describe('Delivery method'),
  isScheduledSend: z.boolean().describe('Whether scheduled for future delivery'),
  referenceId: z.string().describe('Display reference ID'),
  workspaceName: z.string().nullable().describe('Workspace name')
});

export let listOrderBatches = SlateTool.create(spec, {
  name: 'List Order Batches',
  key: 'list_order_batches',
  description: `List all order batches with pagination. Returns summaries including batch status, sender info, order counts, and delivery method.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination, starting at 1'),
      perPage: z.number().optional().describe('Items per page (1-100, default 20)')
    })
  )
  .output(
    z.object({
      orderBatches: z.array(orderBatchSummarySchema).describe('List of order batches'),
      totalCount: z.number().describe('Total number of order batches available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listOrderBatches({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let orderBatches = (result.data || []).map((b: any) => ({
      orderBatchId: b.id,
      sendStatus: b.send_status,
      fromName: b.from_name,
      ordersCount: b.orders_count,
      sendMethod: b.send_method,
      isScheduledSend: b.is_scheduled_send,
      referenceId: b.reference_id,
      workspaceName: b.workspace_name
    }));

    let totalCount = result.list_meta?.total_count || 0;

    return {
      output: { orderBatches, totalCount },
      message: `Found **${totalCount}** order batches. Showing **${orderBatches.length}** on this page.`
    };
  })
  .build();
