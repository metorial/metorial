import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchConsoleClient } from '../lib/client';
import { googleSearchConsoleActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSitemap = SlateTool.create(spec, {
  name: 'Manage Sitemap',
  key: 'manage_sitemap',
  description: `List, retrieve, submit, or delete sitemaps for a Search Console site property. Use "list" to see all sitemaps, "get" to retrieve details of a specific sitemap, "submit" to submit a new sitemap URL, or "delete" to remove a sitemap from the sitemaps report.`,
  instructions: [
    'Deleting a sitemap from the report does not stop Google from crawling it or the URLs within it.',
    'When listing sitemaps, you can optionally filter by a sitemap index URL to see its child sitemaps.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(googleSearchConsoleActionScopes.manageSitemap)
  .input(
    z.object({
      action: z.enum(['list', 'get', 'submit', 'delete']).describe('Action to perform'),
      siteUrl: z.string().describe('The site URL as defined in Search Console'),
      sitemapUrl: z
        .string()
        .optional()
        .describe('The sitemap URL — required for "get", "submit", and "delete" actions'),
      sitemapIndex: z
        .string()
        .optional()
        .describe(
          'For "list" action only: filter sitemaps that belong to this sitemap index URL'
        )
    })
  )
  .output(
    z.object({
      actionPerformed: z.string().describe('The action that was performed'),
      sitemaps: z
        .array(
          z.object({
            path: z.string().describe('URL of the sitemap'),
            lastSubmitted: z
              .string()
              .optional()
              .describe('Date/time of submission (RFC 3339)'),
            lastDownloaded: z
              .string()
              .optional()
              .describe('Date/time last downloaded by Google (RFC 3339)'),
            isPending: z
              .boolean()
              .optional()
              .describe('Whether the sitemap is still pending processing'),
            isSitemapsIndex: z
              .boolean()
              .optional()
              .describe('Whether this is a sitemap index file'),
            type: z
              .string()
              .optional()
              .describe('Sitemap type (e.g., sitemap, rssFeed, atomFeed)'),
            errors: z.number().optional().describe('Number of errors'),
            warnings: z.number().optional().describe('Number of warnings'),
            contents: z
              .array(
                z.object({
                  type: z.string().describe('Content type (web, image, video, etc.)'),
                  submitted: z
                    .number()
                    .optional()
                    .describe('Number of submitted URLs of this type')
                })
              )
              .optional()
              .describe('Breakdown by content type')
          })
        )
        .optional()
        .describe('List of sitemaps (for "list" and "get" actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchConsoleClient(ctx.auth.token);
    let { action, siteUrl, sitemapUrl, sitemapIndex } = ctx.input;

    if (action === 'list') {
      let sitemaps = await client.listSitemaps(siteUrl, sitemapIndex);
      return {
        output: {
          actionPerformed: 'listed',
          sitemaps: sitemaps.map(s => ({
            path: s.path,
            lastSubmitted: s.lastSubmitted,
            lastDownloaded: s.lastDownloaded,
            isPending: s.isPending,
            isSitemapsIndex: s.isSitemapsIndex,
            type: s.type,
            errors: s.errors,
            warnings: s.warnings,
            contents: s.contents?.map(c => ({ type: c.type, submitted: c.submitted }))
          }))
        },
        message: `Found **${sitemaps.length}** sitemap${sitemaps.length === 1 ? '' : 's'} for **${siteUrl}**.`
      };
    }

    if (action === 'get') {
      if (!sitemapUrl) {
        throw new Error('sitemapUrl is required for the "get" action');
      }
      let sitemap = await client.getSitemap(siteUrl, sitemapUrl);
      return {
        output: {
          actionPerformed: 'retrieved',
          sitemaps: [
            {
              path: sitemap.path,
              lastSubmitted: sitemap.lastSubmitted,
              lastDownloaded: sitemap.lastDownloaded,
              isPending: sitemap.isPending,
              isSitemapsIndex: sitemap.isSitemapsIndex,
              type: sitemap.type,
              errors: sitemap.errors,
              warnings: sitemap.warnings,
              contents: sitemap.contents?.map(c => ({ type: c.type, submitted: c.submitted }))
            }
          ]
        },
        message: `Retrieved sitemap **${sitemap.path}** — type: **${sitemap.type || 'unknown'}**, errors: **${sitemap.errors ?? 0}**, warnings: **${sitemap.warnings ?? 0}**.`
      };
    }

    if (action === 'submit') {
      if (!sitemapUrl) {
        throw new Error('sitemapUrl is required for the "submit" action');
      }
      await client.submitSitemap(siteUrl, sitemapUrl);
      return {
        output: {
          actionPerformed: 'submitted'
        },
        message: `Sitemap **${sitemapUrl}** has been submitted for **${siteUrl}**.`
      };
    }

    // action === 'delete'
    if (!sitemapUrl) {
      throw new Error('sitemapUrl is required for the "delete" action');
    }
    await client.deleteSitemap(siteUrl, sitemapUrl);
    return {
      output: {
        actionPerformed: 'deleted'
      },
      message: `Sitemap **${sitemapUrl}** has been removed from the sitemaps report for **${siteUrl}**. Note: Google may continue crawling this sitemap.`
    };
  })
  .build();
