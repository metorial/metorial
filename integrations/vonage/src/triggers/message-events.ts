import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Receive inbound messages and message delivery status updates via Vonage Messages API webhooks. Covers SMS, MMS, WhatsApp, Facebook Messenger, Viber, and RCS channels.'
})
  .input(
    z.object({
      eventType: z
        .enum(['inbound', 'status'])
        .describe('Whether this is an inbound message or a status update'),
      messageUuid: z.string().describe('Unique message identifier'),
      channel: z.string().optional().describe('Messaging channel'),
      from: z.string().optional().describe('Sender identifier'),
      to: z.string().optional().describe('Recipient identifier'),
      timestamp: z.string().optional().describe('Event timestamp'),
      text: z.string().optional().describe('Message text content'),
      messageType: z
        .string()
        .optional()
        .describe('Message type (text, image, audio, video, file)'),
      status: z
        .string()
        .optional()
        .describe('Message delivery status (submitted, delivered, rejected, failed, read)'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      messageUuid: z.string().describe('Unique message identifier'),
      channel: z
        .string()
        .optional()
        .describe('Messaging channel (sms, whatsapp, messenger, viber_service, rcs)'),
      from: z.string().optional().describe('Sender identifier'),
      to: z.string().optional().describe('Recipient identifier'),
      timestamp: z.string().optional().describe('Event timestamp'),
      text: z.string().optional().describe('Message text content (for inbound text messages)'),
      messageType: z.string().optional().describe('Message type'),
      status: z.string().optional().describe('Delivery status (for status events)'),
      clientRef: z.string().optional().describe('Client reference if provided when sending'),
      usage: z.unknown().optional().describe('Usage/pricing information')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      // Determine if this is an inbound message or a status update
      // Inbound messages have message_uuid and a "from" and "to" with channel
      // Status updates have message_uuid and a "status" field
      let isStatus =
        typeof data.status === 'string' &&
        ['submitted', 'delivered', 'rejected', 'failed', 'read', 'accepted'].includes(
          data.status as string
        );
      let eventType = isStatus ? 'status' : 'inbound';
      let messageUuid = (data.message_uuid as string) || '';

      if (!messageUuid) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as 'inbound' | 'status',
            messageUuid,
            channel: data.channel as string | undefined,
            from:
              typeof data.from === 'object'
                ? ((data.from as Record<string, unknown>)?.number as string) ||
                  ((data.from as Record<string, unknown>)?.id as string)
                : (data.from as string | undefined),
            to:
              typeof data.to === 'object'
                ? ((data.to as Record<string, unknown>)?.number as string) ||
                  ((data.to as Record<string, unknown>)?.id as string)
                : (data.to as string | undefined),
            timestamp: data.timestamp as string | undefined,
            text: data.text as string | undefined,
            messageType: data.message_type as string | undefined,
            status: data.status as string | undefined,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { input } = ctx;
      return {
        type: `message.${input.eventType}`,
        id: input.messageUuid + (input.status ? `-${input.status}` : ''),
        output: {
          messageUuid: input.messageUuid,
          channel: input.channel,
          from: input.from,
          to: input.to,
          timestamp: input.timestamp,
          text: input.text,
          messageType: input.messageType,
          status: input.status,
          clientRef: input.raw?.client_ref as string | undefined,
          usage: input.raw?.usage
        }
      };
    }
  })
  .build();
