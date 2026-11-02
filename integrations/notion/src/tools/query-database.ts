import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let queryDatabase = SlateTool.create(spec, {
  name: 'Query Database',
  key: 'query_database',
  description: `Query a Notion database to retrieve its entries (pages) with optional filtering and sorting.
Supports complex filter conditions using compound "and"/"or" filters as well as property-specific filters (text, number, date, checkbox, select, etc.).
For databases with multiple data sources, supply dataSourceId; omitting it returns the available source names and IDs in an error.
Results are paginated; use the cursor to fetch subsequent pages.`,
  instructions: [
    'Filters follow Notion\'s filter format, e.g. { "property": "Status", "select": { "equals": "Done" } }',
    'Compound filters use "and" or "or" arrays: { "and": [ ...filters ] }',
    'Sorts are arrays of objects: [{ "property": "Created", "direction": "descending" }]'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to query'),
      dataSourceId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Data source within the database. Omit to discover choices if the database has multiple sources, then retry with one of those IDs. Reuse the same ID with pagination cursors.'
        ),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter conditions in Notion filter format'),
      sorts: z.array(z.record(z.string(), z.any())).optional().describe('Sort criteria array'),
      startCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.any()))
        .describe(
          "Page objects matching the query. Pass a result object's id as pageId to Get Page or Update Page."
        ),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().nullable().describe('Cursor for the next page of results'),
      dataSourceId: z
        .string()
        .optional()
        .describe('Selected data source ID; reuse it with the next cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let result = await client.queryDatabase(ctx.input.databaseId, {
      dataSourceId: ctx.input.dataSourceId,
      filter: ctx.input.filter,
      sorts: ctx.input.sorts,
      startCursor: ctx.input.startCursor,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        results: result.results,
        hasMore: result.has_more,
        nextCursor: result.next_cursor,
        ...(result.dataSourceId ? { dataSourceId: result.dataSourceId } : {})
      },
      message: `Returned **${result.results.length}** entries from database${result.has_more ? ' — more results available' : ''}`
    };
  })
  .build();
