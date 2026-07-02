import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `Lists GTmetrix pages (URL aggregations). Each page groups reports that share the same URL and analysis options, similar to the GTmetrix Dashboard. Supports filtering by URL or monitoring status, sorting, and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filterUrl: z.string().optional().describe('Filter pages by URL substring'),
      filterMonitored: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Filter by monitoring status'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort field (e.g. "-latest_report_time" for newest first). Prepend "-" for descending.'
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-500, default 10)'),
      pageNumber: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      pages: z.array(pageOutputSchema),
      currentPage: z.number().describe('Current page number'),
      hasNextPage: z.boolean().describe('Whether there are more pages of results'),
      hasPrevPage: z.boolean().describe('Whether there are previous pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPages({
      filterUrl: ctx.input.filterUrl,
      filterMonitored: ctx.input.filterMonitored,
      sort: ctx.input.sort,
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber
    });

    return {
      output: {
        pages: result.items,
        currentPage: result.currentPage,
        hasNextPage: !!result.nextPage,
        hasPrevPage: !!result.prevPage
      },
      message: `Found **${result.items.length}** page(s) (page ${result.currentPage}).${result.items.length > 0 ? `\n${result.items.map(p => `- **${p.url}** (${p.reportCount} reports, monitored: ${p.monitored})`).join('\n')}` : ''}`
    };
  })
  .build();
