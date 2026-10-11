import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

let UPDATE_KINDS = [
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'business_message',
  'edited_business_message',
  'callback_query',
  'inline_query',
  'chosen_inline_result',
  'message_reaction',
  'my_chat_member',
  'chat_member',
  'chat_join_request',
  'poll',
  'poll_answer',
  'pre_checkout_query',
  'shipping_query'
];

let fullName = (user?: { first_name?: string; last_name?: string; title?: string }) =>
  user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.title : undefined;

// The file ID of a message's media, preferring the largest photo size.
let messageFileId = (message: any): string | undefined => {
  if (Array.isArray(message?.photo) && message.photo.length) {
    return message.photo[message.photo.length - 1]?.file_id;
  }
  for (let key of [
    'document',
    'video',
    'animation',
    'audio',
    'voice',
    'video_note',
    'sticker'
  ]) {
    if (message?.[key]?.file_id) return message[key].file_id;
  }
  return undefined;
};

// https://core.telegram.org/bots/api#update
let summarizeUpdate = (update: any) => {
  let type =
    UPDATE_KINDS.find(kind => update[kind] !== undefined) ??
    Object.keys(update).find(key => key !== 'update_id') ??
    'unknown';
  let payload = update[type] ?? {};
  let message = payload.message_id !== undefined ? payload : payload.message;
  let chat = payload.chat ?? message?.chat;
  let from = payload.from ?? payload.user ?? message?.from;

  return {
    updateId: update.update_id as number,
    type,
    chatId: chat?.id === undefined ? undefined : String(chat.id),
    chatType: chat?.type as string | undefined,
    chatTitle: chat ? (chat.title ?? fullName(chat) ?? chat.username) : undefined,
    messageId: message?.message_id as number | undefined,
    messageThreadId: message?.message_thread_id as number | undefined,
    fromUserId: from?.id === undefined ? undefined : String(from.id),
    fromUsername: from?.username as string | undefined,
    fromName: fullName(from),
    text: (message?.text ?? message?.caption) as string | undefined,
    fileId: message ? messageFileId(message) : undefined,
    callbackQueryId: type === 'callback_query' ? (payload.id as string) : undefined,
    callbackData: type === 'callback_query' ? (payload.data as string | undefined) : undefined,
    inlineQueryId: type === 'inline_query' ? (payload.id as string) : undefined,
    inlineQuery: type === 'inline_query' ? (payload.query as string) : undefined,
    date: (message?.date ?? payload.date) as number | undefined
  };
};

export let getUpdatesTool = SlateTool.create(spec, {
  name: 'Get Updates',
  key: 'get_updates',
  description: `Fetch recent incoming updates for the bot, such as messages, button presses, inline queries, and membership changes. Use it to find chat IDs, read messages sent to the bot, and get callback or inline query IDs to answer.`,
  instructions: [
    'Telegram keeps unconfirmed updates for up to 24 hours. To mark updates as processed, call again with offset set to the highest updateId returned plus one; confirmed updates are not returned again.',
    'Omit offset to read pending updates without confirming them.'
  ],
  constraints: [
    'Unavailable while the bot delivers updates to a webhook, including when events are enabled for this connection; Telegram returns a conflict error in that case.',
    'Chat member and reaction updates are only returned when the bot has been configured to receive them.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .int()
        .optional()
        .describe(
          'Identifier of the first update to return. Passing an offset confirms and discards all earlier updates. A negative value returns updates from the end of the queue.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of updates to return (1-100, default 100)')
    })
  )
  .output(
    z.object({
      updates: z
        .array(
          z.object({
            updateId: z
              .number()
              .describe('Update identifier, used to compute the next offset'),
            type: z
              .string()
              .describe(
                'Update type, e.g. message, callback_query, inline_query, chat_member'
              ),
            chatId: z.string().optional().describe('Chat the update belongs to'),
            chatType: z
              .string()
              .optional()
              .describe('Chat type: private, group, supergroup, or channel'),
            chatTitle: z.string().optional().describe('Chat title or private chat name'),
            messageId: z.number().optional().describe('Message ID, for message-based updates'),
            messageThreadId: z.number().optional().describe('Forum topic thread ID'),
            fromUserId: z.string().optional().describe('ID of the user who caused the update'),
            fromUsername: z.string().optional().describe('Username of that user'),
            fromName: z.string().optional().describe('Display name of that user'),
            text: z.string().optional().describe('Message text or media caption'),
            fileId: z
              .string()
              .optional()
              .describe('File ID of attached media, usable with get_file'),
            callbackQueryId: z
              .string()
              .optional()
              .describe('Callback query ID to pass to answer_callback_query'),
            callbackData: z.string().optional().describe('Data of the pressed inline button'),
            inlineQueryId: z
              .string()
              .optional()
              .describe('Inline query ID to pass to answer_inline_query'),
            inlineQuery: z.string().optional().describe('Text of the inline query'),
            date: z.number().optional().describe('Unix timestamp of the update, when known')
          })
        )
        .describe('Updates in the order Telegram received them'),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset that confirms every returned update when passed to the next call')
    })
  )
  .handleInvocation(async ctx => {
    let updates = await new TelegramClient(ctx.auth.token).getUpdates({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let summaries = (updates ?? []).map(summarizeUpdate);
    let last = summaries[summaries.length - 1];

    return {
      output: {
        updates: summaries,
        nextOffset: last ? last.updateId + 1 : undefined
      },
      message: summaries.length
        ? `Fetched ${summaries.length} Telegram update(s). Pass offset ${last!.updateId + 1} to confirm them.`
        : 'No pending Telegram updates.'
    };
  })
  .build();
