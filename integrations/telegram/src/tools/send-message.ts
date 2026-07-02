import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

let inlineKeyboardButtonSchema = z.object({
  text: z.string().describe('Button label text'),
  url: z.string().optional().describe('URL to open when button is pressed'),
  callbackData: z
    .string()
    .optional()
    .describe('Data sent in callback query when button is pressed')
});

let replyMarkupSchema = z
  .object({
    inlineKeyboard: z
      .array(z.array(inlineKeyboardButtonSchema))
      .optional()
      .describe('Inline keyboard rows. Each row is an array of buttons.')
  })
  .optional()
  .describe('Reply markup for inline keyboards');

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a text message to a Telegram chat, group, supergroup, or channel. Supports HTML and Markdown formatting, inline keyboards with callback buttons or URLs, and replying to specific messages.`,
  instructions: [
    'Use parseMode "HTML" or "MarkdownV2" to format text with bold, italic, links, etc.',
    'For inline keyboards, each row is an array of button objects. Each button must have either a url or callbackData.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username of the target chat/channel'),
      text: z.string().describe('Message text to send'),
      parseMode: z
        .enum(['HTML', 'MarkdownV2', 'Markdown'])
        .optional()
        .describe('Text formatting mode'),
      replyToMessageId: z.number().optional().describe('Message ID to reply to'),
      disableNotification: z
        .boolean()
        .optional()
        .describe('Send silently without notification'),
      replyMarkup: replyMarkupSchema,
      messageThreadId: z
        .number()
        .optional()
        .describe('Forum topic thread ID for supergroup forums')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the sent message'),
      chatId: z.string().describe('Chat ID where the message was sent'),
      text: z.string().optional().describe('Text of the sent message'),
      date: z.number().describe('Unix timestamp when the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let replyMarkup: any;
    if (ctx.input.replyMarkup?.inlineKeyboard) {
      replyMarkup = {
        inline_keyboard: ctx.input.replyMarkup.inlineKeyboard.map(row =>
          row.map(btn => ({
            text: btn.text,
            url: btn.url,
            callback_data: btn.callbackData
          }))
        )
      };
    }

    let result = await client.sendMessage({
      chatId: ctx.input.chatId,
      text: ctx.input.text,
      parseMode: ctx.input.parseMode,
      replyToMessageId: ctx.input.replyToMessageId,
      disableNotification: ctx.input.disableNotification,
      replyMarkup,
      messageThreadId: ctx.input.messageThreadId
    });

    return {
      output: {
        messageId: result.message_id,
        chatId: String(result.chat.id),
        text: result.text,
        date: result.date
      },
      message: `Message sent to chat **${ctx.input.chatId}** (message ID: ${result.message_id}).`
    };
  })
  .build();
