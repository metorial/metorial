import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let orderBatchEventInputSchema = z.object({
  eventType: z.string().describe('Webhook event type'),
  eventId: z.string().describe('Unique event identifier'),
  batchData: z.any().describe('Raw order batch data from the webhook payload')
});

let orderPreviewSchema = z.object({
  orderId: z.string().describe('Order ID'),
  status: z.string().describe('Order status'),
  giftLink: z.string().nullable().describe('Gift link URL'),
  recipientFirstName: z.string().nullable().describe('Recipient first name'),
  recipientLastName: z.string().nullable().describe('Recipient last name'),
  recipientEmail: z.string().nullable().describe('Recipient email')
});

export let orderBatchEvents = SlateTrigger.create(spec, {
  name: 'Order Batch Events',
  key: 'order_batch_events',
  description:
    'Triggers on order batch lifecycle events: created and completed. Includes batch details and a preview of individual orders.'
})
  .input(orderBatchEventInputSchema)
  .output(
    z.object({
      orderBatchId: z.string().describe('Order batch ID'),
      sendStatus: z.string().nullable().describe('Batch status'),
      fromName: z.string().nullable().describe('Sender name'),
      message: z.string().nullable().describe('Gift message'),
      ordersCount: z.number().nullable().describe('Number of orders in the batch'),
      recipientsCount: z.number().nullable().describe('Number of recipients'),
      sendMethod: z.string().nullable().describe('Delivery method'),
      isScheduledSend: z
        .boolean()
        .nullable()
        .describe('Whether scheduled for future delivery'),
      scheduledSendOn: z.string().nullable().describe('Scheduled send timestamp'),
      expiresAt: z.string().nullable().describe('Batch expiration timestamp'),
      batchName: z.string().nullable().describe('Internal batch name'),
      referenceId: z.string().nullable().describe('Display reference ID'),
      workspaceId: z.string().nullable().describe('Workspace ID'),
      workspaceName: z.string().nullable().describe('Workspace name'),
      senderFirstName: z.string().nullable().describe('Sender first name'),
      senderLastName: z.string().nullable().describe('Sender last name'),
      senderEmail: z.string().nullable().describe('Sender email'),
      ordersPreview: z.array(orderPreviewSchema).describe('Preview of first 10 orders')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event_type,
            eventId: data.id,
            batchData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let b = ctx.input.batchData || {};

      let ordersPreview = (b.orders_preview || []).map((o: any) => ({
        orderId: o.id,
        status: o.status,
        giftLink: o.individual_gift_link || null,
        recipientFirstName: o.recipient_first_name || null,
        recipientLastName: o.recipient_last_name || null,
        recipientEmail: o.recipient_email || null
      }));

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          orderBatchId: b.id,
          sendStatus: b.send_status || null,
          fromName: b.from_name || null,
          message: b.message || null,
          ordersCount: b.orders_count ?? null,
          recipientsCount: b.recipients_count ?? null,
          sendMethod: b.send_method || null,
          isScheduledSend: b.is_scheduled_send ?? null,
          scheduledSendOn: b.scheduled_send_on || null,
          expiresAt: b.expires_at || null,
          batchName: b.batch_name || null,
          referenceId: b.reference_id || null,
          workspaceId: b.workspace_id || null,
          workspaceName: b.workspace_name || null,
          senderFirstName: b.sender?.first_name || null,
          senderLastName: b.sender?.last_name || null,
          senderEmail: b.sender?.email || null,
          ordersPreview
        }
      };
    }
  })
  .build();
