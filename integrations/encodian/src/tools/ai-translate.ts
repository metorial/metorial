import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let aiTranslate = SlateTool.create(spec, {
  name: 'AI Translate',
  key: 'ai_translate',
  description: `Translate text or files into designated languages using AI translation. Supports translating plain text or HTML content between 100+ languages, as well as translating entire document files while preserving formatting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      translationType: z
        .enum(['text', 'file'])
        .describe('Whether to translate text or a file'),
      text: z.string().optional().describe('Text content to translate (for text translation)'),
      fileName: z
        .string()
        .optional()
        .describe('Source filename with extension (for file translation)'),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded file content (for file translation)'),
      sourceLanguage: z
        .string()
        .optional()
        .describe('Source language code (default: AUTO for auto-detection)'),
      targetLanguage: z
        .string()
        .describe('Target language code (e.g., en, fr, de, es, zh, ja)'),
      format: z
        .enum(['Text', 'HTML'])
        .optional()
        .describe('Text format (for text translation)'),
      profanityAction: z
        .enum(['Delete', 'Keep', 'Replace'])
        .optional()
        .describe('How to handle profanity')
    })
  )
  .output(
    z.object({
      translatedText: z
        .string()
        .optional()
        .describe('Translated text content (for text translation)'),
      fileName: z.string().optional().describe('Output filename (for file translation)'),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded translated file (for file translation)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.translationType === 'text') {
      let body: Record<string, any> = {
        text: ctx.input.text,
        targetLanguage: ctx.input.targetLanguage,
        sourceLanguage: ctx.input.sourceLanguage || 'AUTO'
      };
      if (ctx.input.format) body.format = ctx.input.format;
      if (ctx.input.profanityAction) body.profanityAction = ctx.input.profanityAction;

      let result = await client.aiTranslateText(body);

      return {
        output: {
          translatedText:
            result.translatedText || result.TranslatedText || result.result || '',
          operationId: result.OperationId || ''
        },
        message: `Successfully translated text to **${ctx.input.targetLanguage}**.`
      };
    } else {
      let result = await client.aiTranslateFile({
        fileName: ctx.input.fileName,
        fileContent: ctx.input.fileContent,
        sourceLanguage: ctx.input.sourceLanguage || 'AUTO',
        targetLanguage: ctx.input.targetLanguage
      });

      return {
        output: {
          fileName: result.Filename,
          fileContent: result.FileContent,
          operationId: result.OperationId
        },
        message: `Successfully translated file to **${ctx.input.targetLanguage}**. Output: **${result.Filename}**`
      };
    }
  })
  .build();
