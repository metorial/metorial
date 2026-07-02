import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLanguages = SlateTool.create(spec, {
  name: 'Get Languages',
  key: 'get_languages',
  description: `Retrieve the list of languages available for placement testing. Returns each language's name and code (e.g., \`eng\`, \`ita\`, \`spa\`). Use the language codes when creating test invitations.`,
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
            name: z.string().describe('Display name of the language'),
            code: z
              .string()
              .describe('Language code used when creating invitations (e.g., eng, ita, spa)')
          })
        )
        .describe('List of available languages for placement testing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let languages = await client.getLanguages();

    return {
      output: {
        languages
      },
      message: `Found **${languages.length}** available language(s): ${languages.map(l => `${l.name} (\`${l.code}\`)`).join(', ')}.`
    };
  })
  .build();
