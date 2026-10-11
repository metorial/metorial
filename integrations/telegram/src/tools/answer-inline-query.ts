import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

let SUPPORTED_RESULT_TYPES = ['article', 'photo', 'document', 'video'];

let inlineResultSchema = z.object({
  type: z
    .string()
    .describe(
      'Type of result: "article", "photo", "document", or "video". Articles require title and messageText; documents and videos require title, url, and mimeType; photos and videos require a thumbnail (photos fall back to url).'
    ),
  resultId: z.string().describe('Unique identifier for this result (1-64 bytes)'),
  title: z.string().optional().describe('Title of the result'),
  description: z.string().optional().describe('Short description of the result'),
  url: z
    .string()
    .optional()
    .describe(
      'Article link, or the media URL for photo (JPEG), document (PDF or ZIP), and video results'
    ),
  thumbnailUrl: z.string().optional().describe('URL of the thumbnail for the result'),
  mimeType: z
    .string()
    .optional()
    .describe(
      'MIME type of the media URL: "application/pdf" or "application/zip" for documents (default "application/pdf"), "video/mp4" or "text/html" for videos'
    ),
  messageText: z
    .string()
    .optional()
    .describe(
      'For articles, the text sent when this result is selected. For photos, documents, and videos, the caption sent with the media.'
    ),
  parseMode: z
    .enum(['HTML', 'MarkdownV2', 'Markdown'])
    .optional()
    .describe('Formatting for messageText')
});

type InlineResultInput = z.infer<typeof inlineResultSchema>;

let requireResultField = (result: InlineResultInput, field: keyof InlineResultInput) => {
  let value = result[field];
  if (typeof value !== 'string' || !value) {
    throw createApiServiceError(
      `Inline result "${result.resultId}" of type "${result.type}" requires ${field}.`
    );
  }
  return value;
};

// https://core.telegram.org/bots/api#inlinequeryresult
let formatInlineResult = (r: InlineResultInput) => {
  if (!SUPPORTED_RESULT_TYPES.includes(r.type)) {
    throw createApiServiceError(
      `Inline result type "${r.type}" is not supported. Use one of: ${SUPPORTED_RESULT_TYPES.join(', ')}.`
    );
  }

  let base: Record<string, unknown> = {
    type: r.type,
    id: r.resultId,
    title: r.title,
    description: r.description
  };
  let caption = r.messageText
    ? { caption: r.messageText, parse_mode: r.parseMode }
    : undefined;

  if (r.type === 'article') {
    return {
      ...base,
      title: requireResultField(r, 'title'),
      input_message_content: {
        message_text: requireResultField(r, 'messageText'),
        parse_mode: r.parseMode
      },
      url: r.url,
      thumbnail_url: r.thumbnailUrl
    };
  }

  if (r.type === 'photo') {
    let photoUrl = requireResultField(r, 'url');
    return {
      ...base,
      ...caption,
      photo_url: photoUrl,
      thumbnail_url: r.thumbnailUrl || photoUrl
    };
  }

  if (r.type === 'document') {
    let mimeType = r.mimeType ?? 'application/pdf';
    if (mimeType !== 'application/pdf' && mimeType !== 'application/zip') {
      throw createApiServiceError(
        'Document inline results support only "application/pdf" or "application/zip".'
      );
    }
    return {
      ...base,
      ...caption,
      title: requireResultField(r, 'title'),
      document_url: requireResultField(r, 'url'),
      mime_type: mimeType,
      thumbnail_url: r.thumbnailUrl
    };
  }

  let mimeType = requireResultField(r, 'mimeType');
  if (mimeType !== 'video/mp4' && mimeType !== 'text/html') {
    throw createApiServiceError(
      'Video inline results support only "video/mp4" or "text/html".'
    );
  }
  return {
    ...base,
    ...caption,
    title: requireResultField(r, 'title'),
    video_url: requireResultField(r, 'url'),
    mime_type: mimeType,
    thumbnail_url: requireResultField(r, 'thumbnailUrl')
  };
};

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
      results: z.array(inlineResultSchema).describe('Inline query results to show (up to 50)'),
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

    let formattedResults = ctx.input.results.map(formatInlineResult);

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
