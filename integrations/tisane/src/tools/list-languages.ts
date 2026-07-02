import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLanguages = SlateTool.create(spec, {
  name: 'List Languages',
  key: 'list_languages',
  description: `Retrieves all languages supported by Tisane, with metadata including native name, English name, script direction, and encoding. Use this to discover valid language codes for other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      languages: z
        .array(
          z.object({
            languageCode: z.string().describe('ISO 639-1 language code'),
            nativeName: z.string().describe('Language name in its native script'),
            englishName: z.string().describe('Language name in English'),
            nativeEncoding: z.string().optional().describe('Native character encoding'),
            preferredFont: z.string().optional().describe('Recommended display font'),
            usesLatinScript: z
              .boolean()
              .optional()
              .describe('Whether the language uses Latin script'),
            rightToLeft: z
              .boolean()
              .optional()
              .describe('Whether the language is written right-to-left')
          })
        )
        .describe('List of all supported languages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let langs = await client.listLanguages();

    let mapped = langs.map(l => ({
      languageCode: l.id,
      nativeName: l.name,
      englishName: l.englishName,
      nativeEncoding: l.nativeEncoding,
      preferredFont: l.preferredFont,
      usesLatinScript: l.latin,
      rightToLeft: l.rightToLeft
    }));

    return {
      output: { languages: mapped },
      message: `Found **${mapped.length}** supported languages.`
    };
  })
  .build();
