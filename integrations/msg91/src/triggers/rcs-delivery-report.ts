import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let rcsDeliveryReport = SlateTrigger.create(spec, {
  name: 'RCS Delivery Report',
  key: 'rcs_delivery_report',
  description:
    'Receive delivery status updates for RCS messages including status changes and message details. Configure the webhook URL in the MSG91 dashboard.'
})
  .input(
    z.object({
      messageId: z.string().optional().describe('RCS message ID'),
      recipientNumber: z.string().optional().describe('Recipient phone number'),
      status: z.string().optional().describe('Delivery status'),
      deliveryTime: z.string().optional().describe('Delivery timestamp'),
      extra: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('RCS message ID'),
      recipientNumber: z.string().optional().describe('Recipient phone number'),
      status: z.string().optional().describe('Delivery status'),
      deliveryTime: z.string().optional().describe('Delivery timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          messageId: event.messageId || event.message_id || event.id || undefined,
          recipientNumber: event.mobile || event.number || event.to || undefined,
          status: event.status || event.report_status || undefined,
          deliveryTime: event.deliveryTime || event.delivery_time || undefined,
          extra: event
        }))
      };
    },

    handleEvent: async ctx => {
      let status = (ctx.input.status || 'unknown').toLowerCase();

      return {
        type: `rcs.${status}`,
        id: `${ctx.input.messageId || ''}-${status}-${Date.now()}`,
        output: {
          messageId: ctx.input.messageId,
          recipientNumber: ctx.input.recipientNumber,
          status: ctx.input.status,
          deliveryTime: ctx.input.deliveryTime
        }
      };
    }
  })
  .build();
