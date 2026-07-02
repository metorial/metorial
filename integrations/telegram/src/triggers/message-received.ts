import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

let userSchema = z
  .object({
    userId: z.number().describe('Unique user identifier'),
    isBot: z.boolean().describe('Whether this user is a bot'),
    firstName: z.string().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    username: z.string().optional().describe('Username without @'),
    languageCode: z.string().optional().describe('IETF language tag')
  })
  .optional();

let chatSchema = z.object({
  chatId: z.string().describe('Unique chat identifier'),
  type: z.string().describe('Chat type: private, group, supergroup, or channel'),
  title: z.string().optional().describe('Chat title (groups/channels)'),
  username: z.string().optional().describe('Chat username'),
  firstName: z.string().optional().describe('First name (private chats)'),
  lastName: z.string().optional().describe('Last name (private chats)')
});

export let messageReceivedTrigger = SlateTrigger.create(spec, {
  name: 'Message Received',
  key: 'message_received',
  description:
    'Triggers when a new message, edited message, channel post, or edited channel post is received by the bot.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of message event'),
      message: z.any().describe('Raw message object from Telegram')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('Unique message identifier within the chat'),
      chat: chatSchema,
      from: userSchema,
      date: z.number().describe('Unix timestamp when the message was sent'),
      editDate: z.number().optional().describe('Unix timestamp of the last edit'),
      text: z.string().optional().describe('Message text content'),
      caption: z.string().optional().describe('Caption for media messages'),
      hasPhoto: z.boolean().describe('Whether the message contains a photo'),
      hasDocument: z.boolean().describe('Whether the message contains a document'),
      hasAudio: z.boolean().describe('Whether the message contains audio'),
      hasVideo: z.boolean().describe('Whether the message contains a video'),
      hasSticker: z.boolean().describe('Whether the message contains a sticker'),
      replyToMessageId: z.number().optional().describe('ID of the message being replied to'),
      forwardOriginDate: z
        .number()
        .optional()
        .describe('Unix timestamp of the original forwarded message')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['message', 'edited_message', 'channel_post', 'edited_channel_post'],
        secretToken
      });

      return {
        registrationDetails: { secretToken }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      await client.deleteWebhook();
    },

    handleRequest: async ctx => {
      let registrationDetails = ctx.state?.registrationDetails;
      if (registrationDetails?.secretToken) {
        let isValid = verifySecretToken(ctx.request, registrationDetails.secretToken);
        if (!isValid) {
          return { inputs: [] };
        }
      }

      let data = (await ctx.request.json()) as any;
      let inputs: Array<{ updateId: number; eventType: string; message: any }> = [];

      if (data.message) {
        inputs.push({ updateId: data.update_id, eventType: 'message', message: data.message });
      } else if (data.edited_message) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'edited_message',
          message: data.edited_message
        });
      } else if (data.channel_post) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'channel_post',
          message: data.channel_post
        });
      } else if (data.edited_channel_post) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'edited_channel_post',
          message: data.edited_channel_post
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let msg = ctx.input.message;

      return {
        type: `message.${ctx.input.eventType}`,
        id: `${ctx.input.updateId}`,
        output: {
          messageId: msg.message_id,
          chat: {
            chatId: String(msg.chat.id),
            type: msg.chat.type,
            title: msg.chat.title,
            username: msg.chat.username,
            firstName: msg.chat.first_name,
            lastName: msg.chat.last_name
          },
          from: msg.from
            ? {
                userId: msg.from.id,
                isBot: msg.from.is_bot,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                username: msg.from.username,
                languageCode: msg.from.language_code
              }
            : undefined,
          date: msg.date,
          editDate: msg.edit_date,
          text: msg.text,
          caption: msg.caption,
          hasPhoto: !!msg.photo,
          hasDocument: !!msg.document,
          hasAudio: !!msg.audio,
          hasVideo: !!msg.video,
          hasSticker: !!msg.sticker,
          replyToMessageId: msg.reply_to_message?.message_id,
          forwardOriginDate: msg.forward_date
        }
      };
    }
  })
  .build();
