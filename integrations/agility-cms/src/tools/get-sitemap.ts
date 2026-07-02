import { SlateTool } from 'slates';
import { z } from 'zod';
import { FetchClient } from '../lib/client';
import { spec } from '../spec';

export let getSitemap = SlateTool.create(spec, {
  name: 'Get Sitemap',
  key: 'get_sitemap',
  description: `Retrieves the sitemap for a given channel from the Content Fetch API. Choose **flat** format (dictionary keyed by page path, ideal for routing) or **nested** format (hierarchical array, ideal for navigation menus).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelName: z
        .string()
        .describe('The channel/site name to retrieve the sitemap for (e.g., "website")'),
      format: z
        .enum(['flat', 'nested'])
        .default('flat')
        .describe(
          'Sitemap format: "flat" for path-keyed dictionary or "nested" for hierarchical tree'
        ),
      locale: z.string().optional().describe('Locale code override'),
      apiType: z
        .enum(['fetch', 'preview'])
        .default('fetch')
        .describe('Use "fetch" for published or "preview" for staging content')
    })
  )
  .output(
    z.object({
      sitemap: z
        .any()
        .describe(
          'Sitemap data — flat (object keyed by path) or nested (array of page nodes with children)'
        ),
      format: z.string().describe('The format of the returned sitemap')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FetchClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      apiType: ctx.input.apiType
    });

    let sitemap =
      ctx.input.format === 'nested'
        ? await client.getSitemapNested(ctx.input.channelName)
        : await client.getSitemapFlat(ctx.input.channelName);

    return {
      output: {
        sitemap,
        format: ctx.input.format
      },
      message: `Retrieved **${ctx.input.format}** sitemap for channel **${ctx.input.channelName}**`
    };
  })
  .build();
