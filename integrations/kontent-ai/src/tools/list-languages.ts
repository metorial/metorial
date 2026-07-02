import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listLanguages = SlateTool.create(spec, {
  name: 'List Languages',
  key: 'list_languages',
  description: `Retrieves all languages configured in the environment. Returns language metadata including codename, active status, and fallback language settings. Use language codenames when creating or updating language variants.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
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
      environmentId: ctx.config.environmentId
    });

    let languages = await client.listLanguages();

    let mapped = languages.map(lang => ({
      languageId: lang.id,
      name: lang.name,
      codename: lang.codename,
      isActive: lang.is_active,
      isDefault: lang.is_default,
      fallbackLanguageId: lang.fallback_language?.id,
      externalId: lang.external_id
    }));

    return {
      output: { languages: mapped },
      message: `Retrieved **${mapped.length}** language(s). Active: ${mapped.filter(l => l.isActive).length}, Default: ${mapped.find(l => l.isDefault)?.name || 'N/A'}.`
    };
  })
  .build();
