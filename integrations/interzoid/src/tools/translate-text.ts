import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  name: 'Translate Text',
  key: 'translate_text',
  description: `Detect the language of input text and translate it to **English** or **any other specified language**. The source language is automatically detected.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to translate'),
      targetLanguage: z
        .string()
        .optional()
        .describe(
          'Target language (e.g., "Spanish", "French", "Japanese"). If omitted, translates to English.'
        )
    })
  )
  .output(
    z.object({
      translation: z.string().describe('The translated text'),
      code: z.string().describe('API response status code'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: { Translation: string; Code: string; Credits: number };

    if (ctx.input.targetLanguage) {
      result = await client.translateToAny(ctx.input.text, ctx.input.targetLanguage);
    } else {
      result = await client.translateToEnglish(ctx.input.text);
    }

    return {
      output: {
        translation: result.Translation,
        code: result.Code,
        remainingCredits: result.Credits
      },
      message: `Translated "${ctx.input.text}" → **"${result.Translation}"**`
    };
  })
  .build();
