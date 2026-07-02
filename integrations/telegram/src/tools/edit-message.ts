import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let editMessageTool = SlateTool.create(spec, {
  name: 'Edit Message',
  key: 'edit_message',
  description: `Edit the text of a previously sent message. Works for messages sent by the bot in any chat, or inline messages. Provide either chatId + messageId, or inlineMessageId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z
        .string()
        .optional()
        .describe(
          'Chat ID where the message was sent. Required unless editing an inline message.'
        ),
      messageId: z
        .number()
        .optional()
        .describe('ID of the message to edit. Required unless editing an inline message.'),
      inlineMessageId: z
        .string()
        .optional()
        .describe(
          'ID of the inline message to edit. Required if chatId/messageId are not provided.'
        ),
      text: z.string().describe('New text content for the message'),
      parseMode: z
        .enum(['HTML', 'MarkdownV2', 'Markdown'])
        .optional()
        .describe('Text formatting mode')
    })
  )
  .output(
    z.object({
      messageId: z.number().optional().describe('ID of the edited message'),
      chatId: z.string().optional().describe('Chat ID of the edited message'),
      text: z.string().optional().describe('Updated text of the message'),
      date: z.number().optional().describe('Original send date as Unix timestamp'),
      editDate: z.number().optional().describe('Last edit date as Unix timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let result = await client.editMessageText({
      chatId: ctx.input.chatId,
      messageId: ctx.input.messageId,
      inlineMessageId: ctx.input.inlineMessageId,
      text: ctx.input.text,
      parseMode: ctx.input.parseMode
    });

    if (typeof result === 'boolean') {
      return {
        output: {
          messageId: undefined,
          chatId: undefined,
          text: ctx.input.text,
          date: undefined,
          editDate: undefined
        },
        message: `Inline message edited successfully.`
      };
    }

    return {
      output: {
        messageId: result.message_id,
        chatId: String(result.chat.id),
        text: result.text,
        date: result.date,
        editDate: result.edit_date
      },
      message: `Message **${result.message_id}** in chat **${result.chat.id}** edited.`
    };
  })
  .build();
