import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvent = SlateTrigger.create(spec, {
  name: 'Message Event',
  key: 'message_event',
  description:
    'Triggers when a message is created, updated, or the user is mentioned in a chat room. Webhooks must be configured manually in the Chatwork webhook settings.'
})
  .input(
    z.object({
      eventType: z
        .enum(['message_created', 'message_updated', 'mention_to_me'])
        .describe('Type of message event'),
      webhookSettingId: z.string().describe('Webhook setting ID'),
      eventTime: z.number().describe('Event time as Unix timestamp'),
      messageId: z.string().describe('Message ID'),
      roomId: z.number().describe('Room ID where the event occurred'),
      senderAccountId: z.number().describe('Account ID of the message sender'),
      recipientAccountId: z
        .number()
        .optional()
        .describe('Account ID of the mentioned user (only for mention_to_me)'),
      body: z.string().describe('Message body'),
      sendTime: z.number().describe('Message send time as Unix timestamp'),
      updateTime: z
        .number()
        .describe('Message update time as Unix timestamp (0 if never updated)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      roomId: z.number().describe('Room ID where the event occurred'),
      senderAccountId: z.number().describe('Account ID of the message sender'),
      recipientAccountId: z
        .number()
        .optional()
        .describe('Account ID of the mentioned user (only for mentions)'),
      body: z.string().describe('Message body content'),
      sendTime: z.number().describe('Message send time as Unix timestamp'),
      updateTime: z
        .number()
        .describe('Message update time as Unix timestamp (0 if never updated)'),
      webhookSettingId: z.string().describe('Webhook setting ID'),
      eventTime: z.number().describe('Event time as Unix timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        webhook_setting_id: string;
        webhook_event_type: string;
        webhook_event_time: number;
        webhook_event: {
          message_id?: string;
          room_id?: number;
          account_id?: number;
          from_account_id?: number;
          to_account_id?: number;
          body?: string;
          send_time?: number;
          update_time?: number;
        };
      };

      let event = data.webhook_event;
      let eventType = data.webhook_event_type as
        | 'message_created'
        | 'message_updated'
        | 'mention_to_me';

      let senderAccountId =
        eventType === 'mention_to_me' ? event.from_account_id! : event.account_id!;

      let recipientAccountId = eventType === 'mention_to_me' ? event.to_account_id : undefined;

      return {
        inputs: [
          {
            eventType,
            webhookSettingId: data.webhook_setting_id,
            eventTime: data.webhook_event_time,
            messageId: String(event.message_id || ''),
            roomId: event.room_id || 0,
            senderAccountId,
            recipientAccountId,
            body: event.body || '',
            sendTime: event.send_time || 0,
            updateTime: event.update_time || 0
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `message.${ctx.input.eventType}`,
        id: `${ctx.input.webhookSettingId}-${ctx.input.messageId}-${ctx.input.eventTime}`,
        output: {
          messageId: ctx.input.messageId,
          roomId: ctx.input.roomId,
          senderAccountId: ctx.input.senderAccountId,
          recipientAccountId: ctx.input.recipientAccountId,
          body: ctx.input.body,
          sendTime: ctx.input.sendTime,
          updateTime: ctx.input.updateTime,
          webhookSettingId: ctx.input.webhookSettingId,
          eventTime: ctx.input.eventTime
        }
      };
    }
  })
  .build();
