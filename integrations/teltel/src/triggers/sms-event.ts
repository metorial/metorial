import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let smsEventTrigger = SlateTrigger.create(spec, {
  name: 'SMS Event',
  key: 'sms_event',
  description:
    'Receives SMS event notifications via webhook, including outbound SMS status updates and inbound SMS messages. Configure the SMS webhook URL in TelTel account settings.'
})
  .input(
    z.object({
      direction: z.enum(['inbound', 'outbound', 'unknown']).describe('SMS direction'),
      smsId: z.string().describe('Unique SMS message ID'),
      phone: z
        .string()
        .optional()
        .describe('Phone number (recipient for outbound, sender for inbound)'),
      senderId: z.string().optional().describe('Sender ID or originator'),
      text: z.string().optional().describe('SMS message content'),
      status: z.string().optional().describe('SMS delivery status'),
      time: z.string().optional().describe('Timestamp of the SMS event'),
      price: z.string().optional().describe('Cost of the SMS'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      smsId: z.string().describe('Unique SMS message ID'),
      direction: z.string().describe('SMS direction (inbound or outbound)'),
      phone: z.string().optional().describe('Phone number'),
      senderId: z.string().optional().describe('Sender ID or originator'),
      text: z.string().optional().describe('SMS message content'),
      status: z.string().optional().describe('SMS delivery status'),
      time: z.string().optional().describe('Timestamp of the SMS event'),
      price: z.string().optional().describe('Cost of the SMS')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let params = url.searchParams;

      // Try parsing from query parameters first (GET request)
      let smsId = params.get('sms_id') || params.get('id') || params.get('message_id') || '';
      let phone =
        params.get('phone') ||
        params.get('to') ||
        params.get('from') ||
        params.get('originator') ||
        undefined;
      let senderId =
        params.get('sender_id') || params.get('sender') || params.get('from') || undefined;
      let text =
        params.get('text') || params.get('message') || params.get('body') || undefined;
      let status = params.get('status') || undefined;
      let time = params.get('time') || params.get('timestamp') || undefined;
      let price = params.get('price') || undefined;

      let raw: Record<string, any> = {};
      params.forEach((value, key) => {
        raw[key] = value;
      });

      // If no useful query params, try body
      if (!smsId) {
        try {
          let body = (await ctx.request.json()) as Record<string, any>;
          smsId = body.sms_id || body.id || body.message_id || '';
          phone = body.phone || body.to || body.from || body.originator;
          senderId = body.sender_id || body.sender || body.from;
          text = body.text || body.message || body.body;
          status = body.status;
          time = body.time || body.timestamp;
          price = body.price?.toString();
          raw = body;
        } catch {
          // No valid body
        }
      }

      if (!smsId) {
        smsId = `sms_${Date.now()}`;
      }

      // Determine direction based on available data
      let direction: 'inbound' | 'outbound' | 'unknown' = 'unknown';
      if (text && raw.originator) {
        direction = 'inbound';
      } else if (status) {
        direction = 'outbound';
      }

      return {
        inputs: [
          {
            direction,
            smsId,
            phone: phone || undefined,
            senderId: senderId || undefined,
            text: text || undefined,
            status: status || undefined,
            time: time || undefined,
            price: price || undefined,
            raw
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.direction === 'inbound' ? 'received' : 'status_update';

      return {
        type: `sms.${eventType}`,
        id: ctx.input.smsId,
        output: {
          smsId: ctx.input.smsId,
          direction: ctx.input.direction,
          phone: ctx.input.phone,
          senderId: ctx.input.senderId,
          text: ctx.input.text,
          status: ctx.input.status,
          time: ctx.input.time,
          price: ctx.input.price
        }
      };
    }
  })
  .build();
