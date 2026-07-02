import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  name: 'Translate Text',
  key: 'translate_text',
  description: `Translate text into another language. Supports 25+ languages with automatic source language detection. Provide text and a target language code to get the translation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to translate'),
      targetLang: z
        .string()
        .describe('Target language code (e.g., "en", "de", "fr", "es", "ja", "zh")'),
      sourceLang: z
        .string()
        .optional()
        .describe('Source language code or "auto" for automatic detection (default: "auto")')
    })
  )
  .output(
    z.object({
      translations: z
        .array(
          z.object({
            text: z.string().describe('Translated text'),
            index: z.number().describe('Index of this generation')
          })
        )
        .describe('Array of translation outputs'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.translateText({
      text: ctx.input.text,
      targetLang: ctx.input.targetLang,
      sourceLang: ctx.input.sourceLang
    });

    let outputs = result.data.outputs;

    return {
      output: {
        translations: outputs.map(o => ({ text: o.text, index: o.index })),
        remainingCredits: result.data.remaining_credits
      },
      message: `Translated text to **${ctx.input.targetLang}**. Remaining credits: ${result.data.remaining_credits}.`
    };
  })
  .build();
