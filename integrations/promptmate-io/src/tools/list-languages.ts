import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLanguages = SlateTool.create(spec, {
  name: 'List Languages',
  key: 'list_languages',
  description:
    'List the language values accepted by Promptmate.io app job configuration. Returns the provider strings without assigning language codes.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      languages: z.array(z.string()).describe('Language values returned by the provider'),
      raw: z.array(z.string()).optional().describe('Complete language response')
    })
  )
  .handleInvocation(async ctx => {
    let languages = await new Client({ token: ctx.auth.token }).listLanguageValues();
    return {
      output: { languages, raw: languages },
      message: `Found **${languages.length}** language value(s).`
    };
  })
  .build();
