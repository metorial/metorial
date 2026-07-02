import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateText = SlateTool.create(spec, {
  name: 'Translate Text',
  key: 'translate_text',
  description: `Translates text between supported languages. Supports auto-detection of the source language. If source and target languages are the same, paraphrasing is applied instead.
Handles obfuscated and slang content, preserving emotional register — profanities and slurs are translated faithfully.`,
  instructions: [
    'Use "*" as the source language for automatic detection.',
    'Set the same language for both source and target to paraphrase the text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromLanguage: z
        .string()
        .describe(
          'IETF language code for the source language (e.g., "ja"). Use "*" for auto-detection.'
        ),
      toLanguage: z
        .string()
        .describe('IETF language code for the target language (e.g., "en")'),
      content: z.string().describe('The text to translate')
    })
  )
  .output(
    z.object({
      translatedText: z.string().describe('The translated (or paraphrased) text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let translated = await client.translate(
      ctx.input.fromLanguage,
      ctx.input.toLanguage,
      ctx.input.content
    );

    let action =
      ctx.input.fromLanguage === ctx.input.toLanguage ? 'Paraphrased' : 'Translated';

    return {
      output: { translatedText: translated },
      message: `${action} text from \`${ctx.input.fromLanguage}\` to \`${ctx.input.toLanguage}\`.`
    };
  })
  .build();
