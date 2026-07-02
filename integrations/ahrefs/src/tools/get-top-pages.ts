import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTopPages = SlateTool.create(spec, {
  name: 'Get Top Pages',
  key: 'get_top_pages',
  description: `Retrieve top pages for a domain ranked by organic traffic. Also supports fetching pages by traffic volume and best pages by external/internal link count.
Use to identify a site's highest-traffic content and most linked-to pages.`,
  instructions: [
    'Set "reportType" to choose between top-pages, pages-by-traffic, best-by-external-links, or best-by-internal-links.'
  ],
  constraints: [
    'Consumes API units (minimum 50 per request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain or URL to get top pages for'),
      reportType: z
        .enum([
          'top-pages',
          'pages-by-traffic',
          'best-by-external-links',
          'best-by-internal-links'
        ])
        .optional()
        .describe('Type of pages report to retrieve. Defaults to "top-pages".'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode: "exact", "domain", "subdomains", or "prefix"'),
      country: z.string().optional().describe('Two-letter country code for localized results'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (JSON string)'),
      orderBy: z.string().optional().describe('Sort order, e.g., "traffic:desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      pages: z.any().describe('List of pages with their metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let reportType = ctx.input.reportType || 'top-pages';

    let params = {
      target: ctx.input.target,
      date: ctx.input.date,
      mode: ctx.input.mode,
      country: ctx.input.country,
      select: ctx.input.select,
      where: ctx.input.where,
      order_by: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };

    let result: any;
    switch (reportType) {
      case 'pages-by-traffic':
        result = await client.getPagesByTraffic(params);
        break;
      case 'best-by-external-links':
        result = await client.getBestByExternalLinks(params);
        break;
      case 'best-by-internal-links':
        result = await client.getBestByInternalLinks(params);
        break;
      default:
        result = await client.getTopPages(params);
    }

    return {
      output: {
        pages: result
      },
      message: `Retrieved ${reportType} report for **${ctx.input.target}**.`
    };
  })
  .build();
