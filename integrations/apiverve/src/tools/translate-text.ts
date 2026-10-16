import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  key: 'translate_text',
  name: 'Translate Text',
  description:
    'Translate text to a target language, with an optional source language or automatic detection.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      text: z.string().describe('Text to translate'),
      targetLanguage: z.string().describe('Target language code, such as es or fr'),
      sourceLanguage: z
        .string()
        .optional()
        .describe('Source language code; omit to detect it automatically')
    })
  )
  .output(
    z.object({
      sourceLanguage: z.string(),
      targetLanguage: z.string(),
      translatedText: z.string(),
      rawData: z.any().optional().describe('Complete provider result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { data } = await client.translate(
      ctx.input.text,
      ctx.input.targetLanguage,
      ctx.input.sourceLanguage
    );
    return {
      output: client.sanitize({
        sourceLanguage: data.sourceLang,
        targetLanguage: data.targetLang,
        translatedText: data.translatedText,
        rawData: data
      }),
      message: 'Text translated successfully.'
    };
  })
  .build();
