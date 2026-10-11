import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getTelegramErrorDescription } from '../chat/lib/errors';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

let isNoTextToEdit = (error: unknown) =>
  /no text in the message to edit/i.test(getTelegramErrorDescription(error) ?? '');

export let editMessageTool = SlateTool.create(spec, {
  name: 'Edit Message',
  key: 'edit_message',
  description: `Edit the text of a previously sent message, or the caption of a photo, video, audio, or document message. Works for messages sent by the bot in any chat, or inline messages. Provide either chatId + messageId, or inlineMessageId.`,
  constraints: ['Text is limited to 4096 characters and media captions to 1024 characters.'],
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
      text: z.string().describe('New text, or the new caption for a media message'),
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
    if (
      !ctx.input.inlineMessageId &&
      (!ctx.input.chatId || ctx.input.messageId === undefined)
    ) {
      throw createApiServiceError('Provide chatId and messageId, or inlineMessageId.');
    }

    let client = new TelegramClient(ctx.auth.token);
    let target = {
      chatId: ctx.input.chatId,
      messageId: ctx.input.messageId,
      inlineMessageId: ctx.input.inlineMessageId,
      parseMode: ctx.input.parseMode
    };

    let result: any;
    try {
      result = await client.editMessageText({ ...target, text: ctx.input.text });
    } catch (error) {
      // Media messages carry a caption instead of text.
      if (!isNoTextToEdit(error)) throw error;
      result = await client.editMessageCaption({ ...target, caption: ctx.input.text });
    }

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
        text: result.text ?? result.caption,
        date: result.date,
        editDate: result.edit_date
      },
      message: `Message **${result.message_id}** in chat **${result.chat.id}** edited.`
    };
  })
  .build();
