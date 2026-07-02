import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let whatsappDeliveryReport = SlateTrigger.create(spec, {
  name: 'WhatsApp Delivery Report',
  key: 'whatsapp_delivery_report',
  description:
    'Receive delivery status updates and inbound messages for WhatsApp. Covers outbound request sent, delivery reports (Sent, Failed, Delivered, Read), inbound request submitted, and inbound delivery confirmation. Configure the webhook URL in the MSG91 dashboard.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'WhatsApp event type (outbound_sent, outbound_report, inbound_request, inbound_report)'
        ),
      requestId: z.string().optional().describe('Message request ID'),
      recipientNumber: z.string().optional().describe('Recipient or sender phone number'),
      status: z.string().optional().describe('Delivery status'),
      direction: z.string().optional().describe('Message direction: inbound or outbound'),
      messageContent: z.string().optional().describe('Message content (for inbound messages)'),
      extra: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Message request ID'),
      recipientNumber: z.string().optional().describe('Phone number'),
      status: z.string().optional().describe('Delivery status'),
      direction: z.string().optional().describe('Message direction'),
      messageContent: z.string().optional().describe('Message content for inbound messages')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => {
          let direction =
            event.direction || (event.type?.includes('inbound') ? 'inbound' : 'outbound');
          return {
            eventType: event.event || event.eventType || event.event_type || 'report_received',
            requestId: event.requestId || event.request_id || event.id || undefined,
            recipientNumber:
              event.mobile || event.number || event.from || event.to || undefined,
            status: event.status || event.report_status || undefined,
            direction,
            messageContent: event.message || event.body || event.text || undefined,
            extra: event
          };
        })
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      return {
        type: `whatsapp.${eventType}`,
        id: `${ctx.input.requestId || ''}-${eventType}-${Date.now()}`,
        output: {
          requestId: ctx.input.requestId,
          recipientNumber: ctx.input.recipientNumber,
          status: ctx.input.status,
          direction: ctx.input.direction,
          messageContent: ctx.input.messageContent
        }
      };
    }
  })
  .build();
