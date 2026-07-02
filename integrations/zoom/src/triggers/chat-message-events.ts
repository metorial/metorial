import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let chatMessageEvents = SlateTrigger.create(spec, {
  name: 'Chat Message Events',
  key: 'chat_message_events',
  description:
    'Triggers on Zoom Team Chat message events: sent, updated, deleted, reactions, and file-sharing events.'
})
  .input(
    z.object({
      eventType: z.string().describe('The specific event type (e.g., chat_message.sent)'),
      eventTimestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      accountId: z.string().optional().describe('Zoom account ID'),
      message: z.any().describe('Chat message object from the webhook payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Message ID'),
      channelId: z.string().optional().describe('Channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      senderEmail: z.string().optional().describe('Sender email'),
      senderDisplayName: z.string().optional().describe('Sender display name'),
      messageContent: z.string().optional().describe('Message text content'),
      timestamp: z.string().optional().describe('Message timestamp'),
      contactEmail: z.string().optional().describe('Direct message contact email')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event === 'endpoint.url_validation') {
        return {
          inputs: [],
          response: new Response(
            JSON.stringify({
              plainToken: body.payload?.plainToken,
              encryptedToken: body.payload?.plainToken
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        };
      }

      let eventType = body.event as string;

      if (!eventType?.startsWith('chat_message.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTimestamp: body.event_ts,
            accountId: body.payload?.account_id,
            message: body.payload?.object || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let msg = ctx.input.message as any;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${msg?.id || ''}-${ctx.input.eventTimestamp || Date.now()}`,
        output: {
          messageId: msg?.id as string | undefined,
          channelId: msg?.channel_id as string | undefined,
          channelName: msg?.channel_name as string | undefined,
          senderEmail: (msg?.sender || msg?.operator) as string | undefined,
          senderDisplayName: (msg?.sender_display_name || msg?.operator_display_name) as
            | string
            | undefined,
          messageContent: msg?.message as string | undefined,
          timestamp: (msg?.date_time || msg?.timestamp) as string | undefined,
          contactEmail: msg?.contact_email as string | undefined
        }
      };
    }
  })
  .build();
