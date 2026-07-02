import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let forwardMessageTool = SlateTool.create(spec, {
  name: 'Forward Message',
  key: 'forward_message',
  description: `Forward a message from one chat to another. The original sender attribution is preserved.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Target chat ID or @username to forward the message to'),
      fromChatId: z
        .string()
        .describe('Source chat ID or @username where the original message exists'),
      messageId: z.number().describe('ID of the message to forward'),
      disableNotification: z
        .boolean()
        .optional()
        .describe('Forward silently without notification'),
      messageThreadId: z
        .number()
        .optional()
        .describe('Forum topic thread ID in the target supergroup')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the forwarded message in the target chat'),
      chatId: z.string().describe('Target chat ID where the message was forwarded'),
      date: z.number().describe('Unix timestamp when the message was forwarded'),
      forwardOriginDate: z
        .number()
        .optional()
        .describe('Unix timestamp of the original message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let result = await client.forwardMessage({
      chatId: ctx.input.chatId,
      fromChatId: ctx.input.fromChatId,
      messageId: ctx.input.messageId,
      disableNotification: ctx.input.disableNotification,
      messageThreadId: ctx.input.messageThreadId
    });

    return {
      output: {
        messageId: result.message_id,
        chatId: String(result.chat.id),
        date: result.date,
        forwardOriginDate: result.forward_date
      },
      message: `Message forwarded from chat **${ctx.input.fromChatId}** to chat **${ctx.input.chatId}** (new message ID: ${result.message_id}).`
    };
  })
  .build();
