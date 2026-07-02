import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  name: 'Translate Text',
  key: 'translate_text',
  description: `Translate text between 160+ languages with context awareness. Supports both single strings and batch translation of multiple strings in one request. The source language is auto-detected if not specified.`,
  constraints: ['Maximum text length is 5000 characters per string.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Text to translate. Can be a single string or an array of strings for batch translation.'
        ),
      targetLanguage: z
        .string()
        .describe('Target language code (e.g., "es", "fr", "de", "ja")'),
      currentLanguage: z
        .string()
        .optional()
        .describe('Source language code. Auto-detected if not provided.')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      translatedText: z
        .union([z.string(), z.array(z.string())])
        .describe('Translated text matching the input format (single string or array)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.translateText({
      text: ctx.input.text,
      targetLanguage: ctx.input.targetLanguage,
      currentLanguage: ctx.input.currentLanguage
    });

    let count = Array.isArray(ctx.input.text) ? ctx.input.text.length : 1;

    return {
      output: {
        success: result.success,
        translatedText: result.translated_text
      },
      message: `Translated **${count} text(s)** to **${ctx.input.targetLanguage}**.`
    };
  })
  .build();
