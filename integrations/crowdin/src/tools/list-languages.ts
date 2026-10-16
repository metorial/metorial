import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export const listLanguagesTool = SlateTool.create(spec, {
  key: 'list_languages',
  name: 'List Supported Languages',
  description:
    'Discover Crowdin language identifiers and names for projects, translations, translation memories, and glossaries.',
  tags: { readOnly: true }
})
  .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
  .output(
    z.object({
      languages: z.array(
        z.object({
          languageId: z.string(),
          name: z.string(),
          locale: z.string().optional(),
          twoLettersCode: z.string().optional(),
          threeLettersCode: z.string().optional()
        })
      ),
      pagination: z.object({ offset: z.number(), limit: z.number() }),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.listSupportedLanguages(ctx.input);
    const languages = result.data.map(
      (item: {
        data: {
          id: string;
          name: string;
          locale?: string;
          twoLettersCode?: string;
          threeLettersCode?: string;
        };
      }) => ({
        languageId: item.data.id,
        name: item.data.name,
        locale: item.data.locale,
        twoLettersCode: item.data.twoLettersCode,
        threeLettersCode: item.data.threeLettersCode
      })
    );
    return {
      output: { languages, pagination: result.pagination, raw: client.lastResponse },
      message: `Found ${languages.length} supported languages.`
    };
  })
  .build();
