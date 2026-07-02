import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let smsDeliveryReport = SlateTrigger.create(spec, {
  name: 'SMS Delivery Report',
  key: 'sms_delivery_report',
  description:
    'Receive real-time delivery status updates for sent SMS messages. Statuses include Sent, Delivered, Failed, and Read. Configure the webhook URL in the MSG91 dashboard under webhook settings.'
})
  .input(
    z.object({
      requestId: z.string().describe('Unique message request ID'),
      telNum: z.string().describe('Recipient phone number'),
      status: z.string().describe('Delivery status (Sent, Delivered, Failed, Read)'),
      deliveryTime: z.string().optional().describe('Delivery timestamp'),
      senderId: z.string().optional().describe('Sender ID used'),
      clientId: z.string().optional().describe('Custom client tracking ID'),
      extra: z.any().optional().describe('Additional webhook payload data')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique message request ID'),
      recipientNumber: z.string().describe('Recipient phone number'),
      status: z.string().describe('Delivery status'),
      deliveryTime: z.string().optional().describe('Delivery timestamp'),
      senderId: z.string().optional().describe('Sender ID'),
      clientId: z.string().optional().describe('Custom client tracking ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          requestId: event.requestId || event.request_id || '',
          telNum: event.telNum || event.tel_num || event.mobile || '',
          status: event.status || event.report_status || '',
          deliveryTime: event.deliveryTime || event.delivery_time || undefined,
          senderId: event.senderId || event.sender_id || undefined,
          clientId: event.clientId || event.client_id || undefined,
          extra: event
        }))
      };
    },

    handleEvent: async ctx => {
      let status = ctx.input.status.toLowerCase();
      let eventType = `sms.${status}`;

      return {
        type: eventType,
        id: `${ctx.input.requestId}-${ctx.input.telNum}-${status}`,
        output: {
          requestId: ctx.input.requestId,
          recipientNumber: ctx.input.telNum,
          status: ctx.input.status,
          deliveryTime: ctx.input.deliveryTime,
          senderId: ctx.input.senderId,
          clientId: ctx.input.clientId
        }
      };
    }
  })
  .build();
