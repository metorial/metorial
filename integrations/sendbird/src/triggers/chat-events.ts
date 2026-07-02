import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let chatEvents = SlateTrigger.create(spec, {
  name: 'Chat Events',
  key: 'chat_events',
  description:
    'Receives webhook events for chat activity including messages, channels, users, and moderation events. Configure the webhook URL in your Sendbird Dashboard under Settings > Chat > Webhooks.'
})
  .input(
    z.object({
      category: z
        .string()
        .describe('Webhook event category (e.g. "group_channel:message_send")'),
      senderUserId: z.string().optional().describe('User ID of the event sender'),
      channelUrl: z.string().optional().describe('Channel URL related to the event'),
      channelType: z
        .string()
        .optional()
        .describe('Channel type (group_channels or open_channels)'),
      messageId: z
        .number()
        .optional()
        .describe('Message ID if the event relates to a message'),
      messageText: z.string().optional().describe('Message text content'),
      appId: z.string().optional().describe('Application ID'),
      timestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      rawPayload: z.any().describe('Full raw webhook payload from Sendbird')
    })
  )
  .output(
    z.object({
      category: z.string().describe('Event category'),
      channelUrl: z.string().optional().describe('Channel URL'),
      channelType: z.string().optional().describe('Channel type'),
      senderUserId: z.string().optional().describe('User ID of the sender'),
      senderNickname: z.string().optional().describe('Nickname of the sender'),
      messageId: z.number().optional().describe('Message ID'),
      messageText: z.string().optional().describe('Message text content'),
      messageType: z.string().optional().describe('Type of message (MESG, FILE, ADMM)'),
      mentionType: z.string().optional().describe('Mention type if applicable'),
      customType: z.string().optional().describe('Custom type of the message or channel'),
      memberCount: z.number().optional().describe('Channel member count'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('Member user ID'),
            nickname: z.string().describe('Member nickname')
          })
        )
        .optional()
        .describe('Affected members (for invite/join/leave events)'),
      timestamp: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let category = body.category ?? 'unknown';
      let sender = body.sender ?? {};
      let channel = body.channel ?? {};
      let payload = body.payload ?? {};

      let messageId = payload.message_id ?? body.message_id;
      let messageText = payload.message ?? body.message;

      let _members: Array<{ userId: string; nickname: string }> | undefined;
      if (body.users) {
        _members = (body.users as any[]).map((u: any) => ({
          userId: u.user_id ?? '',
          nickname: u.nickname ?? ''
        }));
      } else if (body.invitees) {
        _members = (body.invitees as any[]).map((u: any) => ({
          userId: u.user_id ?? '',
          nickname: u.nickname ?? ''
        }));
      }

      return {
        inputs: [
          {
            category,
            senderUserId: sender.user_id,
            channelUrl: channel.channel_url,
            channelType: channel.channel_type ?? body.channel_type,
            messageId: typeof messageId === 'number' ? messageId : undefined,
            messageText: typeof messageText === 'string' ? messageText : undefined,
            appId: body.app_id,
            timestamp: body.ts ?? body.created_at,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { category, rawPayload } = ctx.input;

      let sender = rawPayload?.sender ?? {};
      let channel = rawPayload?.channel ?? {};
      let payload = rawPayload?.payload ?? {};

      let members: Array<{ userId: string; nickname: string }> | undefined;
      if (rawPayload?.users) {
        members = (rawPayload.users as any[]).map((u: any) => ({
          userId: u.user_id ?? '',
          nickname: u.nickname ?? ''
        }));
      } else if (rawPayload?.invitees) {
        members = (rawPayload.invitees as any[]).map((u: any) => ({
          userId: u.user_id ?? '',
          nickname: u.nickname ?? ''
        }));
      }

      let eventId = [
        category,
        ctx.input.channelUrl,
        ctx.input.messageId,
        ctx.input.senderUserId,
        ctx.input.timestamp
      ]
        .filter(Boolean)
        .join(':');

      return {
        type: category.replace(/:/g, '.'),
        id: eventId,
        output: {
          category,
          channelUrl: channel.channel_url ?? ctx.input.channelUrl,
          channelType: channel.channel_type ?? ctx.input.channelType,
          senderUserId: sender.user_id ?? ctx.input.senderUserId,
          senderNickname: sender.nickname,
          messageId: ctx.input.messageId ?? payload.message_id,
          messageText: ctx.input.messageText ?? payload.message,
          messageType: payload.type ?? rawPayload?.type,
          mentionType: payload.mention_type,
          customType: payload.custom_type ?? channel.custom_type,
          memberCount: channel.member_count,
          members,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
