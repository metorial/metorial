import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageSitemaps = SlateTool.create(spec, {
  name: 'Manage Sitemaps',
  key: 'manage_sitemaps',
  description: `Submit, list, update, delete, or trigger a crawl for XML sitemaps in Prerender. Sitemaps allow Prerender to automatically discover and cache all listed URLs. New URLs from sitemaps are added to the rendering queue and rechecked on a configurable interval.`,
  instructions: [
    'Use action `list` to see all registered sitemaps.',
    'Use action `create` to submit a new XML sitemap URL.',
    "Use action `update` to change a sitemap's recrawl interval or adaptive type.",
    'Use action `delete` to remove a sitemap.',
    'Use action `crawl` to immediately trigger a sitemap recrawl.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'crawl'])
        .describe('The operation to perform.'),
      sitemapUrl: z
        .string()
        .optional()
        .describe('The XML sitemap URL. Required for `create`.'),
      sitemapId: z
        .string()
        .optional()
        .describe('The sitemap ID. Required for `update`, `delete`, and `crawl`.'),
      revisitInterval: z
        .enum(['weekly', 'daily', 'hourly'])
        .optional()
        .describe(
          'How often Prerender should recheck the sitemap. Used in `create` and `update`.'
        ),
      adaptiveType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Rendering type for sitemap URLs. Used in `create` and `update`.'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination when listing sitemaps.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page when listing sitemaps.')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Response from the Prerender sitemap API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });
    let result: unknown;
    let actionDescription: string;

    switch (ctx.input.action) {
      case 'list': {
        result = await client.listSitemaps(ctx.input.page, ctx.input.pageSize);
        actionDescription = 'Listed sitemaps';
        break;
      }
      case 'create': {
        if (!ctx.input.sitemapUrl) {
          throw new Error('sitemapUrl is required for the create action.');
        }
        result = await client.createSitemapV3({
          url: ctx.input.sitemapUrl,
          adaptiveType: ctx.input.adaptiveType,
          revisitInterval: ctx.input.revisitInterval
        });
        actionDescription = `Created sitemap for **${ctx.input.sitemapUrl}**`;
        break;
      }
      case 'update': {
        if (!ctx.input.sitemapId) {
          throw new Error('sitemapId is required for the update action.');
        }
        result = await client.updateSitemap(ctx.input.sitemapId, {
          revisitInterval: ctx.input.revisitInterval,
          adaptiveType: ctx.input.adaptiveType
        });
        actionDescription = `Updated sitemap **${ctx.input.sitemapId}**`;
        break;
      }
      case 'delete': {
        if (!ctx.input.sitemapId) {
          throw new Error('sitemapId is required for the delete action.');
        }
        result = await client.deleteSitemap(ctx.input.sitemapId);
        actionDescription = `Deleted sitemap **${ctx.input.sitemapId}**`;
        break;
      }
      case 'crawl': {
        if (!ctx.input.sitemapId) {
          throw new Error('sitemapId is required for the crawl action.');
        }
        result = await client.triggerSitemapCrawl(ctx.input.sitemapId);
        actionDescription = `Triggered crawl for sitemap **${ctx.input.sitemapId}**`;
        break;
      }
    }

    return {
      output: {
        result
      },
      message: `${actionDescription!}.`
    };
  })
  .build();
