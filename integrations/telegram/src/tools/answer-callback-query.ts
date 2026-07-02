import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let answerCallbackQueryTool = SlateTool.create(spec, {
  name: 'Answer Callback Query',
  key: 'answer_callback_query',
  description: `Respond to a callback query from an inline keyboard button press. Can show a notification or alert to the user, or open a URL. Must be called within 30 seconds of receiving the callback.`,
  constraints: ['Must be called within 30 seconds of receiving the callback query.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      callbackQueryId: z.string().describe('ID of the callback query to answer'),
      text: z
        .string()
        .optional()
        .describe('Notification text shown to the user (0-200 characters)'),
      showAlert: z
        .boolean()
        .optional()
        .describe('Show as a modal alert instead of a brief notification'),
      url: z.string().optional().describe('URL to open (for game bots or Mini Apps)'),
      cacheTime: z
        .number()
        .optional()
        .describe('Max time in seconds to cache the result on the client (default 0)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the callback query was answered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let result = await client.answerCallbackQuery({
      callbackQueryId: ctx.input.callbackQueryId,
      text: ctx.input.text,
      showAlert: ctx.input.showAlert,
      url: ctx.input.url,
      cacheTime: ctx.input.cacheTime
    });

    return {
      output: { success: result },
      message: `Callback query **${ctx.input.callbackQueryId}** answered${ctx.input.text ? ` with: "${ctx.input.text}"` : ''}.`
    };
  })
  .build();
