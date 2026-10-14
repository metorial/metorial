import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transliterateTextTool = SlateTool.create(spec, {
  name: 'Transliterate Text',
  key: 'transliterate_text',
  description: `Transliterates Arabizi or Romanized Arabic chat text into native Arabic script. Use translate_name for translating names between other supported languages and scripts.`,
  constraints: [
    'Maximum payload size is 600KB with a maximum of 50,000 characters.',
    'Only Arabizi-to-native-Arabic transliteration is exposed. The provider ignores the language field.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to transliterate'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      transliteration: z.string().describe('The transliterated text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.transliterate(ctx.input.content, ctx.input.language);

    let transliteration = result.transliteration ?? '';

    return {
      output: {
        transliteration
      },
      message: `Transliterated text: "${transliteration}"`
    };
  })
  .build();
