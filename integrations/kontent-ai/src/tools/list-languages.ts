import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { environmentIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let listLanguages = SlateTool.create(spec, {
  name: 'List Languages',
  key: 'list_languages',
  description: `Retrieves a page of languages configured in the environment. Returns language metadata including codename, active status, and fallback language settings. Use language codenames when creating or updating language variants, and continuationToken to fetch more languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      environmentId: environmentIdInput,
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token from the previous page; omit for the first page.')
    })
  )
  .output(
    z.object({
      continuationToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of languages'),
      languages: z.array(
        z.object({
          languageId: z.string().describe('Internal ID of the language'),
          name: z.string().describe('Display name of the language'),
          codename: z.string().describe('Codename of the language (e.g., "en-US", "default")'),
          isActive: z.boolean().describe('Whether the language is active'),
          isDefault: z.boolean().describe('Whether this is the default language'),
          fallbackLanguageId: z.string().optional().describe('ID of the fallback language'),
          externalId: z.string().optional().describe('External ID if set')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.input.environmentId ?? ctx.config.environmentId
    });

    let result = await client.listLanguages(ctx.input.continuationToken);

    let mapped = result.languages.map(lang => ({
      languageId: lang.id,
      name: lang.name,
      codename: lang.codename,
      isActive: lang.is_active,
      isDefault: lang.is_default,
      fallbackLanguageId: lang.fallback_language?.id,
      externalId: lang.external_id
    }));

    return {
      output: { languages: mapped, continuationToken: result.continuationToken },
      message: `Retrieved **${mapped.length}** language(s).${result.continuationToken ? ' More languages are available with continuationToken.' : ''}`
    };
  })
  .build();
