import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

let inlineResultSchema = z.object({
  type: z.string().describe('Type of result (e.g. "article", "photo", "video", "document")'),
  resultId: z.string().describe('Unique identifier for this result (1-64 characters)'),
  title: z.string().optional().describe('Title of the result'),
  description: z.string().optional().describe('Short description of the result'),
  url: z.string().optional().describe('URL of the result (for articles, documents, etc.)'),
  thumbnailUrl: z.string().optional().describe('URL of the thumbnail for the result'),
  messageText: z.string().optional().describe('Text to send when this result is selected'),
  parseMode: z
    .enum(['HTML', 'MarkdownV2', 'Markdown'])
    .optional()
    .describe('Formatting for messageText')
});

let inlineQueryButtonSchema = z
  .object({
    text: z.string().describe('Label text for the button shown above inline results'),
    startParameter: z
      .string()
      .optional()
      .describe('Deep-linking /start parameter for opening a private chat with the bot'),
    webAppUrl: z
      .string()
      .optional()
      .describe('HTTPS URL of a Web App to launch from the inline results button')
  })
  .refine(
    button =>
      [button.startParameter, button.webAppUrl].filter(value => value !== undefined).length ===
      1,
    {
      message: 'Provide exactly one of startParameter or webAppUrl'
    }
  );

export let answerInlineQueryTool = SlateTool.create(spec, {
  name: 'Answer Inline Query',
  key: 'answer_inline_query',
  description: `Respond to an inline query with a list of results. When a user types "@botname query" in any chat, the bot receives an inline query and should respond with results the user can select and send.`,
  constraints: [
    'Must be called within 30 seconds of receiving the inline query.',
    'Maximum 50 results per response.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inlineQueryId: z.string().describe('ID of the inline query to answer'),
      results: z.array(inlineResultSchema).describe('Array of inline query results to show'),
      cacheTime: z
        .number()
        .optional()
        .describe('Max time in seconds to cache results (default 300)'),
      isPersonal: z.boolean().optional().describe('Whether results are specific to this user'),
      nextOffset: z.string().optional().describe('Offset for pagination of results'),
      button: inlineQueryButtonSchema
        .optional()
        .describe('Optional button to show above inline query results')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the inline query was answered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let formattedResults = ctx.input.results.map(r => {
      let base: any = {
        type: r.type,
        id: r.resultId,
        title: r.title,
        description: r.description
      };

      if (r.type === 'article') {
        base.input_message_content = r.messageText
          ? { message_text: r.messageText, parse_mode: r.parseMode }
          : undefined;
        base.url = r.url;
        base.thumbnail_url = r.thumbnailUrl;
      } else if (r.type === 'photo') {
        base.photo_url = r.url;
        base.thumbnail_url = r.thumbnailUrl || r.url;
      } else if (r.type === 'document') {
        base.document_url = r.url;
        base.thumbnail_url = r.thumbnailUrl;
        base.mime_type = 'application/pdf';
      }

      return base;
    });

    let result = await client.answerInlineQuery({
      inlineQueryId: ctx.input.inlineQueryId,
      results: formattedResults,
      cacheTime: ctx.input.cacheTime,
      isPersonal: ctx.input.isPersonal,
      nextOffset: ctx.input.nextOffset,
      button: ctx.input.button
        ? {
            text: ctx.input.button.text,
            start_parameter: ctx.input.button.startParameter,
            web_app: ctx.input.button.webAppUrl
              ? { url: ctx.input.button.webAppUrl }
              : undefined
          }
        : undefined
    });

    return {
      output: { success: result },
      message: `Inline query **${ctx.input.inlineQueryId}** answered with ${ctx.input.results.length} result(s).`
    };
  })
  .build();
