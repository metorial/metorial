import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across all pages and databases shared with the integration by title.
Returns matching pages and databases with their metadata. Best suited for finding resources by name rather than exhaustive enumeration.`,
  constraints: [
    'Search is not guaranteed to return all matching resources.',
    'Results are limited to resources the integration has been given access to.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search term to filter by title. Omit to list all accessible resources.'),
      filterType: z
        .enum(['page', 'database'])
        .optional()
        .describe('Restrict results to pages or databases only'),
      sortDirection: z
        .enum(['ascending', 'descending'])
        .optional()
        .default('descending')
        .describe('Sort direction by last edited time'),
      startCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of results to return (max 100)')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching page and database objects'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let filter = ctx.input.filterType
      ? {
          property: 'object' as const,
          value: ctx.input.filterType === 'database' ? 'database' : 'page'
        }
      : undefined;

    let sort = ctx.input.sortDirection
      ? { timestamp: 'last_edited_time' as const, direction: ctx.input.sortDirection }
      : undefined;

    let result = await client.search({
      query: ctx.input.query,
      filter,
      sort,
      startCursor: ctx.input.startCursor,
      pageSize: ctx.input.pageSize
    });

    let pageCount = result.results.filter((r: any) => r.object === 'page').length;
    let dbCount = result.results.filter((r: any) => r.object === 'database').length;

    return {
      output: {
        results: result.results,
        hasMore: result.has_more,
        nextCursor: result.next_cursor
      },
      message: `Found **${result.results.length}** results${ctx.input.query ? ` for "${ctx.input.query}"` : ''} (${pageCount} pages, ${dbCount} databases)${result.has_more ? ' — more results available' : ''}`
    };
  })
  .build();
