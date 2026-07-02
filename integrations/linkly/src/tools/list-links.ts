import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLinks = SlateTool.create(spec, {
  name: 'List Links',
  key: 'list_links',
  description: `Lists all shortened links in the workspace with pagination support. Can search links by keyword and sort results. Returns link details including click statistics.`,
  instructions: [
    'Use the search parameter to filter links by keyword.',
    'Results are paginated — use page and pageSize to navigate.'
  ],
  constraints: ['Maximum page size is 1000 links.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search keyword to filter links'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of links per page (default: 1000, max: 1000)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      links: z
        .array(
          z.object({
            linkId: z.number().describe('Unique ID of the link'),
            url: z.string().describe('Destination URL'),
            fullUrl: z.string().optional().nullable().describe('Full short URL'),
            name: z.string().optional().nullable().describe('Link nickname'),
            domain: z.string().optional().nullable().describe('Custom domain'),
            slug: z.string().optional().nullable().describe('URL slug'),
            enabled: z.boolean().optional().describe('Whether the link is active'),
            clicksTotal: z.number().optional().describe('Total number of clicks'),
            clicksToday: z.number().optional().describe('Number of clicks today'),
            clicksThirtyDays: z
              .number()
              .optional()
              .describe('Number of clicks in last 30 days')
          })
        )
        .describe('Array of links'),
      pageNumber: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Page size'),
      totalEntries: z.number().optional().describe('Total number of links'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listLinks(ctx.input);
    let linksArr = result.links || result;
    let links = (Array.isArray(linksArr) ? linksArr : []).map((link: any) => ({
      linkId: link.id,
      url: link.url,
      fullUrl: link.full_url,
      name: link.name,
      domain: link.domain,
      slug: link.slug,
      enabled: link.enabled,
      clicksTotal: link.clicks_total,
      clicksToday: link.clicks_today,
      clicksThirtyDays: link.clicks_thirty_days
    }));

    return {
      output: {
        links,
        pageNumber: result.page_number,
        pageSize: result.page_size,
        totalEntries: result.total_entries,
        totalPages: result.total_pages
      },
      message: `Found **${links.length}** links${result.total_entries ? ` (${result.total_entries} total)` : ''}`
    };
  })
  .build();
