import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let smsEvents = SlateTrigger.create(spec, {
  name: 'SMS Events',
  key: 'sms_events',
  description:
    'Receive SMS delivery reports and inbound SMS messages. Configure the webhook URL in the Mocean dashboard or per-request via the delivery report URL / inbound SMS webhook settings.'
})
  .input(
    z.object({
      eventType: z.enum(['delivery_report', 'inbound_message']).describe('Type of SMS event'),
      messageId: z.string().describe('Message identifier'),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Recipient phone number'),
      deliveryStatus: z.number().optional().describe('Delivery status code'),
      errorCode: z.string().optional().describe('Delivery error code'),
      text: z.string().optional().describe('Inbound message text'),
      keyword: z.string().optional().describe('MO keyword'),
      coding: z.number().optional().describe('Character encoding'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message identifier'),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Recipient phone number'),
      deliveryStatus: z
        .string()
        .optional()
        .describe('Delivery status: "delivered", "failed", or "expired"'),
      errorCode: z.string().optional().describe('Delivery error code'),
      text: z.string().optional().describe('Inbound message text'),
      keyword: z.string().optional().describe('MO keyword from inbound message'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let method = ctx.request.method;
      let body: any;

      try {
        body = await ctx.request.json();
      } catch {
        // Some webhooks may send form-encoded data
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }

      // Delivery Report is sent as PUT, Inbound SMS as POST
      if (method === 'PUT' || body['mocean-dlr-status'] !== undefined) {
        let _dlrStatusMap: Record<string, string> = {
          '1': 'delivered',
          '2': 'failed',
          '3': 'expired'
        };

        return {
          inputs: [
            {
              eventType: 'delivery_report' as const,
              messageId: body['mocean-msgid'] || '',
              from: String(body['mocean-from'] || ''),
              to: String(body['mocean-to'] || ''),
              deliveryStatus: Number(body['mocean-dlr-status']),
              errorCode: String(body['mocean-error-code'] || '')
            }
          ]
        };
      }

      // Inbound SMS
      return {
        inputs: [
          {
            eventType: 'inbound_message' as const,
            messageId: `inbound_${body['mocean-from']}_${body['mocean-time'] || Date.now()}`,
            from: String(body['mocean-from'] || ''),
            to: String(body['mocean-to'] || ''),
            text: body['mocean-text'],
            keyword: body['mocean-keyword'],
            coding: body['mocean-coding'] ? Number(body['mocean-coding']) : undefined,
            timestamp: body['mocean-time']
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      if (input.eventType === 'delivery_report') {
        let dlrStatusMap: Record<number, string> = {
          1: 'delivered',
          2: 'failed',
          3: 'expired'
        };

        return {
          type: 'sms.delivery_report',
          id: `dlr_${input.messageId}_${input.deliveryStatus}`,
          output: {
            messageId: input.messageId,
            from: input.from,
            to: input.to,
            deliveryStatus:
              input.deliveryStatus !== undefined
                ? dlrStatusMap[input.deliveryStatus] || 'unknown'
                : undefined,
            errorCode: input.errorCode
          }
        };
      }

      return {
        type: 'sms.inbound',
        id: input.messageId,
        output: {
          messageId: input.messageId,
          from: input.from,
          to: input.to,
          text: input.text,
          keyword: input.keyword,
          timestamp: input.timestamp
        }
      };
    }
  })
  .build();
