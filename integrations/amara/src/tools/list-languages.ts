import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLanguages = SlateTool.create(spec, {
  name: 'List Supported Languages',
  key: 'list_languages',
  description: `Retrieve the full list of languages supported by the Amara platform, with their BCP-47 codes and names.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      languages: z.array(
        z.object({
          code: z.string().describe('BCP-47 language code'),
          name: z.string().describe('Language name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listLanguages();

    // The API may return either an array of objects or a mapping
    let languages: Array<{ code: string; name: string }> = [];

    if (Array.isArray(result)) {
      languages = result.map((l: any) => ({
        code: l.code || l.language_code || '',
        name: l.name || ''
      }));
    } else if (typeof result === 'object') {
      languages = Object.entries(result).map(([code, name]) => ({
        code,
        name: String(name)
      }));
    }

    return {
      output: { languages },
      message: `Found **${languages.length}** supported language(s).`
    };
  })
  .build();
