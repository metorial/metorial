import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let orderPreviewSchema = z.object({
  orderId: z.string().describe('Order ID'),
  status: z.string().describe('Order status'),
  giftLink: z.string().describe('Gift link URL'),
  recipientFirstName: z.string().describe('Recipient first name'),
  recipientLastName: z.string().nullable().describe('Recipient last name'),
  recipientEmail: z.string().nullable().describe('Recipient email')
});

export let getOrderBatch = SlateTool.create(spec, {
  name: 'Get Order Batch',
  key: 'get_order_batch',
  description: `Retrieve details of an order batch including status, sender info, cart, and a preview of individual orders. For batches with more than 10 orders, use the List Order Batch Orders tool to paginate through all orders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderBatchId: z.string().describe('ID of the order batch to retrieve')
    })
  )
  .output(
    z.object({
      orderBatchId: z.string().describe('Order batch ID'),
      sendStatus: z.string().describe('Batch status: pending, complete, failed, or canceled'),
      fromName: z.string().describe('Sender name'),
      message: z.string().nullable().describe('Gift message'),
      ordersCount: z.number().describe('Total number of orders'),
      recipientsCount: z.number().describe('Total number of recipients'),
      sendMethod: z.string().describe('Delivery method used'),
      isScheduledSend: z.boolean().describe('Whether scheduled for future delivery'),
      scheduledSendOn: z.string().nullable().describe('Scheduled send timestamp'),
      expiresAt: z.string().nullable().describe('Batch expiration timestamp'),
      batchName: z.string().nullable().describe('Internal batch name'),
      referenceId: z.string().describe('Display reference ID'),
      workspaceId: z.string().nullable().describe('Workspace ID'),
      workspaceName: z.string().nullable().describe('Workspace name'),
      ordersPreview: z.array(orderPreviewSchema).describe('Preview of first 10 orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let b = await client.getOrderBatch(ctx.input.orderBatchId);

    let ordersPreview = (b.orders_preview || []).map((o: any) => ({
      orderId: o.id,
      status: o.status,
      giftLink: o.individual_gift_link,
      recipientFirstName: o.recipient_first_name,
      recipientLastName: o.recipient_last_name,
      recipientEmail: o.recipient_email
    }));

    return {
      output: {
        orderBatchId: b.id,
        sendStatus: b.send_status,
        fromName: b.from_name,
        message: b.message,
        ordersCount: b.orders_count,
        recipientsCount: b.recipients_count,
        sendMethod: b.send_method,
        isScheduledSend: b.is_scheduled_send,
        scheduledSendOn: b.scheduled_send_on,
        expiresAt: b.expires_at,
        batchName: b.batch_name,
        referenceId: b.reference_id,
        workspaceId: b.workspace_id,
        workspaceName: b.workspace_name,
        ordersPreview
      },
      message: `Order batch **${b.reference_id}** — **${b.orders_count}** orders, status: **${b.send_status}**.`
    };
  })
  .build();
