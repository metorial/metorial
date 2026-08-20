import { SlateTrigger } from 'slates';
import { z } from 'zod';
import {
  registerTelegramWebhook,
  telegramWebhookHttp,
  unregisterTelegramWebhook
} from '../lib/webhook-utils';
import { spec } from '../spec';

export let callbackQueryReceivedTrigger = SlateTrigger.create(spec, {
  name: 'Callback Query Received',
  key: 'callback_query_received',
  description:
    'Triggers when a user presses an inline keyboard button and a callback query is received.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      callbackQuery: z.any().describe('Raw callback query object from Telegram')
    })
  )
  .output(
    z.object({
      callbackQueryId: z
        .string()
        .describe('Unique callback query identifier (use to answer the query)'),
      chatId: z.string().optional().describe('Chat ID where the button was pressed'),
      messageId: z.number().optional().describe('Message ID containing the inline keyboard'),
      inlineMessageId: z
        .string()
        .optional()
        .describe('Inline message ID if the button was on an inline message'),
      callbackData: z.string().optional().describe('Data associated with the callback button'),
      fromUserId: z.number().describe('User ID of the person who pressed the button'),
      fromFirstName: z.string().describe('First name of the user'),
      fromUsername: z.string().optional().describe('Username of the user'),
      chatInstance: z.string().describe('Global identifier for the chat')
    })
  )
  .webhook({
    http: telegramWebhookHttp,
    autoRegisterWebhook: ctx => registerTelegramWebhook(ctx, ['callback_query']),
    autoUnregisterWebhook: unregisterTelegramWebhook,

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let inputs: Array<{ updateId: number; callbackQuery: any }> = [];

      if (data.callback_query) {
        inputs.push({ updateId: data.update_id, callbackQuery: data.callback_query });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let cq = ctx.input.callbackQuery;

      return {
        type: 'callback_query.received',
        id: `${ctx.input.updateId}`,
        output: {
          callbackQueryId: cq.id,
          chatId: cq.message?.chat?.id ? String(cq.message.chat.id) : undefined,
          messageId: cq.message?.message_id,
          inlineMessageId: cq.inline_message_id,
          callbackData: cq.data,
          fromUserId: cq.from.id,
          fromFirstName: cq.from.first_name,
          fromUsername: cq.from.username,
          chatInstance: cq.chat_instance
        }
      };
    }
  })
  .build();
