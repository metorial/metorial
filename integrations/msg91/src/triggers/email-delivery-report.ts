import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emailDeliveryReport = SlateTrigger.create(spec, {
  name: 'Email Delivery Report',
  key: 'email_delivery_report',
  description:
    'Receive delivery status updates for sent emails including request received, delivery reports, opened, clicked, unsubscribed, and complaints. Configure separate webhooks in the MSG91 dashboard for each event type.'
})
  .input(
    z.object({
      eventType: z.string().describe('Email event type'),
      requestId: z.string().optional().describe('Unique email request ID'),
      recipientEmail: z.string().optional().describe('Recipient email address'),
      status: z.string().optional().describe('Delivery status'),
      reason: z.string().optional().describe('Failure or event reason'),
      messageId: z.string().optional().describe('Email message ID'),
      extra: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Unique email request ID'),
      recipientEmail: z.string().optional().describe('Recipient email address'),
      status: z.string().optional().describe('Delivery status'),
      reason: z.string().optional().describe('Failure or event reason'),
      messageId: z.string().optional().describe('Email message ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          eventType: event.event || event.eventType || event.event_type || 'report_received',
          requestId:
            event.requestId ||
            event.request_id ||
            event.uniqueId ||
            event.unique_id ||
            undefined,
          recipientEmail:
            event.email || event.recipientEmail || event.recipient_email || undefined,
          status: event.status || event.report_status || undefined,
          reason: event.reason || event.description || undefined,
          messageId: event.messageId || event.message_id || undefined,
          extra: event
        }))
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      return {
        type: `email.${eventType}`,
        id: `${ctx.input.requestId || ctx.input.messageId || ''}-${eventType}-${Date.now()}`,
        output: {
          requestId: ctx.input.requestId,
          recipientEmail: ctx.input.recipientEmail,
          status: ctx.input.status,
          reason: ctx.input.reason,
          messageId: ctx.input.messageId
        }
      };
    }
  })
  .build();
