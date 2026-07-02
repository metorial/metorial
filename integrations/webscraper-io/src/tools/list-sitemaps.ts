import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSitemaps = SlateTool.create(spec, {
  name: 'List Sitemaps',
  key: 'list_sitemaps',
  description: `List all sitemaps in your account with pagination support. Optionally filter by tag name.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      tag: z.string().optional().describe('Filter sitemaps by tag name')
    })
  )
  .output(
    z.object({
      sitemaps: z.array(
        z.object({
          sitemapId: z.number().describe('Numeric ID of the sitemap'),
          sitemapName: z.string().describe('Name of the sitemap')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of sitemaps'),
      perPage: z.number().describe('Number of sitemaps per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listSitemaps({
      page: ctx.input.page,
      tag: ctx.input.tag
    });

    return {
      output: {
        sitemaps: result.sitemaps.map((s: any) => ({
          sitemapId: s.id,
          sitemapName: s.name
        })),
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        total: result.total,
        perPage: result.perPage
      },
      message: `Found **${result.total}** sitemaps (page ${result.currentPage}/${result.lastPage}).`
    };
  })
  .build();
