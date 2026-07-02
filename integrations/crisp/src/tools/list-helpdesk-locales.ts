import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listHelpdeskLocales = SlateTool.create(spec, {
  name: 'List Helpdesk Locales',
  key: 'list_helpdesk_locales',
  description: `List helpdesk knowledge base locales configured for the Crisp workspace. Use this to find locale IDs before listing or managing articles.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      locales: z
        .array(
          z.object({
            localeId: z.string().optional().describe('Helpdesk locale identifier'),
            name: z.string().optional().describe('Locale display name'),
            articles: z.number().optional().describe('Number of articles in the locale'),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .describe('List of helpdesk locales')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let results = await client.listHelpdeskLocales();

    let locales = (results || []).map((locale: any) => ({
      localeId: locale.locale ?? locale.locale_id ?? locale.id,
      name: locale.name,
      articles: locale.articles,
      createdAt: locale.created_at ? String(locale.created_at) : undefined,
      updatedAt: locale.updated_at ? String(locale.updated_at) : undefined
    }));

    return {
      output: { locales },
      message: `Found **${locales.length}** helpdesk locales.`
    };
  })
  .build();
