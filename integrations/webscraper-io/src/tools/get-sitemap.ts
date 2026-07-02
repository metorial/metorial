import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSitemap = SlateTool.create(spec, {
  name: 'Get Sitemap',
  key: 'get_sitemap',
  description: `Retrieve a single sitemap by its ID, including its full configuration with selectors and start URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sitemapId: z.number().describe('The numeric ID of the sitemap to retrieve')
    })
  )
  .output(
    z.object({
      sitemapId: z.number().describe('The numeric ID of the sitemap'),
      sitemapName: z.string().describe('Name of the sitemap'),
      sitemapDefinition: z
        .string()
        .describe(
          'JSON string containing the full sitemap definition with selectors and start URLs'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getSitemap(ctx.input.sitemapId);

    return {
      output: {
        sitemapId: result.id,
        sitemapName: result.name,
        sitemapDefinition:
          typeof result.sitemap === 'string' ? result.sitemap : JSON.stringify(result.sitemap)
      },
      message: `Retrieved sitemap **${result.name}** (ID: \`${result.id}\`).`
    };
  })
  .build();
