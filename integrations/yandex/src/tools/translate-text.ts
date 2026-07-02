import { SlateTool } from 'slates';
import { z } from 'zod';
import * as translate from '../lib/translate';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  name: 'Translate Text',
  key: 'translate_text',
  description: `Translate text between languages using Yandex Translate. Supports automatic source language detection and both plain text and HTML formats.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID for billing'),
      texts: z.array(z.string()).describe('Texts to translate'),
      targetLanguageCode: z
        .string()
        .describe('Target language code in ISO 639-1 format (e.g. en, ru, de)'),
      sourceLanguageCode: z
        .string()
        .optional()
        .describe('Source language code (auto-detected if not specified)'),
      format: z.enum(['PLAIN_TEXT', 'HTML']).optional().describe('Text format')
    })
  )
  .output(
    z.object({
      translations: z
        .array(
          z.object({
            text: z.string().describe('Translated text'),
            detectedLanguageCode: z
              .string()
              .optional()
              .describe('Detected source language code')
          })
        )
        .describe('Translation results')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await translate.translateText(ctx.auth, {
      folderId,
      texts: ctx.input.texts,
      targetLanguageCode: ctx.input.targetLanguageCode,
      sourceLanguageCode: ctx.input.sourceLanguageCode,
      format: ctx.input.format
    });

    return {
      output: {
        translations: result.translations || []
      },
      message: `Translated ${ctx.input.texts.length} text(s) to **${ctx.input.targetLanguageCode}**.`
    };
  })
  .build();

export let detectLanguage = SlateTool.create(spec, {
  name: 'Detect Language',
  key: 'detect_language',
  description: `Detect the language of a given text using Yandex Translate. Optionally provide language hints to improve detection accuracy.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID for billing'),
      text: z.string().describe('Text to detect language for'),
      languageCodeHints: z
        .array(z.string())
        .optional()
        .describe('Language codes to prioritize during detection')
    })
  )
  .output(
    z.object({
      languageCode: z.string().describe('Detected language code in ISO 639-1 format')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await translate.detectLanguage(ctx.auth, {
      folderId,
      text: ctx.input.text,
      languageCodeHints: ctx.input.languageCodeHints
    });

    return {
      output: {
        languageCode: result.languageCode
      },
      message: `Detected language: **${result.languageCode}**.`
    };
  })
  .build();

export let listLanguages = SlateTool.create(spec, {
  name: 'List Languages',
  key: 'list_languages',
  description: `List all languages supported by Yandex Translate with their ISO 639-1 codes and names.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID for billing')
    })
  )
  .output(
    z.object({
      languages: z
        .array(
          z.object({
            code: z.string().describe('ISO 639-1 language code'),
            name: z.string().optional().describe('Language name')
          })
        )
        .describe('Supported languages')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await translate.listLanguages(ctx.auth, folderId);

    return {
      output: {
        languages: result.languages || []
      },
      message: `Found ${(result.languages || []).length} supported language(s).`
    };
  })
  .build();
