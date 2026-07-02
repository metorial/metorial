import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageAckTrigger = SlateTrigger.create(spec, {
  name: 'Message Acknowledgement',
  key: 'message_ack',
  description:
    'Triggers when the delivery status of a sent message changes. Tracks message progression from sent to servers, delivered to recipient, and read by recipient.'
})
  .input(
    z.object({
      eventType: z.string().describe('The event type identifier.'),
      messageId: z.string().describe('WhatsApp unique message ID.'),
      customMessageId: z
        .string()
        .optional()
        .describe('Your custom tracking ID provided when sending the message.'),
      ackStatus: z
        .number()
        .describe(
          'Acknowledgement status code: 0=not sent, 1=sent to servers, 2=delivered, 3=read.'
        ),
      raw: z.any().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('WhatsApp unique message ID.'),
      customMessageId: z
        .string()
        .optional()
        .describe('Your custom tracking ID provided when sending the message.'),
      ackStatus: z
        .number()
        .describe(
          'Acknowledgement status code: 0=not sent, 1=sent to servers, 2=delivered, 3=read.'
        ),
      ackLabel: z
        .string()
        .describe('Human-readable acknowledgement status: not_sent, sent, delivered, or read.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Only process ACK events, skip message events
      if (data.event_type !== 'ack') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            messageId: data.id ?? '',
            customMessageId: data.cuid,
            ackStatus: data.ack ?? 0,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ackLabels: Record<number, string> = {
        0: 'not_sent',
        1: 'sent',
        2: 'delivered',
        3: 'read'
      };

      let ackLabel = ackLabels[ctx.input.ackStatus] ?? 'unknown';

      return {
        type: `message.${ackLabel}`,
        id: `${ctx.input.messageId}-ack-${ctx.input.ackStatus}`,
        output: {
          messageId: ctx.input.messageId,
          customMessageId: ctx.input.customMessageId,
          ackStatus: ctx.input.ackStatus,
          ackLabel
        }
      };
    }
  })
  .build();
