import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transliterateTextTool = SlateTool.create(spec, {
  name: 'Transliterate Text',
  key: 'transliterate_text',
  description: `Converts text from one script to another without translation, preserving the phonetic representation. For example, converts Arabic or Cyrillic script text to Latin script, or romanized Arabic text to standard Arabic characters.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
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
