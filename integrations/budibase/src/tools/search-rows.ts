import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sortSchema = z
  .object({
    column: z.string().optional().describe('Column name to sort by'),
    order: z.enum(['ascending', 'descending']).optional().describe('Sort direction'),
    type: z.enum(['string', 'number']).optional().describe('Type of sorting to apply')
  })
  .optional();

let querySchema = z
  .object({
    allOr: z
      .boolean()
      .optional()
      .describe('Use OR logic instead of AND for combining filters'),
    string: z
      .record(z.string(), z.string())
      .optional()
      .describe('Prefix matching on string fields'),
    fuzzy: z
      .record(z.string(), z.string())
      .optional()
      .describe('Substring matching on string fields'),
    equal: z.record(z.string(), z.any()).optional().describe('Exact value matching'),
    notEqual: z.record(z.string(), z.any()).optional().describe('Exclude specific values'),
    range: z
      .record(z.string(), z.object({ low: z.any(), high: z.any() }))
      .optional()
      .describe('Range filtering with low/high bounds'),
    empty: z
      .record(z.string(), z.string())
      .optional()
      .describe('Filter for rows where column is empty'),
    notEmpty: z
      .record(z.string(), z.string())
      .optional()
      .describe('Filter for rows where column is not empty'),
    oneOf: z
      .record(z.string(), z.array(z.any()))
      .optional()
      .describe('Match any value in the provided array'),
    contains: z
      .record(z.string(), z.array(z.any()))
      .optional()
      .describe('Array column contains all specified values'),
    notContains: z
      .record(z.string(), z.array(z.any()))
      .optional()
      .describe('Array column does not contain specified values'),
    containsAny: z
      .record(z.string(), z.array(z.any()))
      .optional()
      .describe('Array column contains any of the specified values')
  })
  .optional();

export let searchRows = SlateTool.create(spec, {
  name: 'Search Rows',
  key: 'search_rows',
  description: `Search for rows in a Budibase table with filtering, sorting, and pagination. Supports various filter operators including exact match, fuzzy search, range queries, and array operations.`,
  instructions: [
    'Use the query object to apply filters. Each filter type maps column names to values.',
    'Set paginate to true and use bookmark for cursor-based pagination.',
    'The returned rows use the squashed "primaryDisplay" format for related rows; use the "Manage Row" tool with action "get" to retrieve fully enriched relationships.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('Application ID that the table belongs to'),
      tableId: z.string().describe('Table ID to search rows in'),
      query: querySchema.describe('Filter conditions to apply'),
      sort: sortSchema.describe('Sorting configuration'),
      paginate: z.boolean().optional().describe('Enable pagination'),
      bookmark: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Pagination cursor from a previous search result'),
      limit: z.number().optional().describe('Maximum number of rows to return')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.any())).describe('List of matching rows'),
      bookmark: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Cursor for the next page of results'),
      hasNextPage: z.boolean().optional().describe('Whether more rows are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      appId: ctx.input.appId
    });

    let result = await client.searchRows(ctx.input.tableId, {
      query: ctx.input.query,
      sort: ctx.input.sort,
      paginate: ctx.input.paginate,
      bookmark: ctx.input.bookmark,
      limit: ctx.input.limit
    });

    return {
      output: {
        rows: result.rows,
        bookmark: result.bookmark,
        hasNextPage: result.hasNextPage
      },
      message: `Found **${result.rows.length}** row(s) in table ${ctx.input.tableId}.${result.hasNextPage ? ' More rows available via pagination.' : ''}`
    };
  })
  .build();
