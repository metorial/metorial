import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

export let getSite = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Retrieve site-level metadata and configuration from your Ghost instance, including title, description, logo, language, and other global settings.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      title: z.string().describe('Site title'),
      description: z.string().nullable().describe('Site description'),
      logo: z.string().nullable().describe('Site logo URL'),
      icon: z.string().nullable().describe('Site icon URL'),
      coverImage: z.string().nullable().describe('Site cover image URL'),
      url: z.string().describe('Site URL'),
      version: z.string().describe('Ghost version'),
      lang: z.string().describe('Site language')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let result = await client.readSite();
    let site = result.site;

    return {
      output: {
        title: site.title,
        description: site.description ?? null,
        logo: site.logo ?? null,
        icon: site.icon ?? null,
        coverImage: site.cover_image ?? null,
        url: site.url,
        version: site.version,
        lang: site.lang ?? 'en'
      },
      message: `Site **"${site.title}"** running Ghost v${site.version}.`
    };
  })
  .build();
