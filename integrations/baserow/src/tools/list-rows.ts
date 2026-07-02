import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRows = SlateTool.create(spec, {
  name: 'List Rows',
  key: 'list_rows',
  description: `List rows from a Baserow table with optional filtering, sorting, searching, and pagination. Supports scoping results to a specific view and using human-readable field names.`,
  instructions: [
    'Use `userFieldNames: true` to use human-readable column names instead of field IDs in both input filters and response data.',
    'Filters use the format `filter__field_{fieldId}__{filterType}` as keys. For example: `{ "filter__field_123__equal": "value" }`. When using userFieldNames, use `filter__{fieldName}__{filterType}` instead.',
    'Use `orderBy` with field names or IDs prefixed with `+` (ascending) or `-` (descending), e.g. `"-Name,+Age"`.'
  ],
  constraints: [
    'Maximum page size is 200 rows.',
    'Database Token auth only allows row operations, not structural changes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table to list rows from'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      size: z.number().optional().describe('Number of rows per page (default 100, max 200)'),
      search: z.string().optional().describe('Full-text search query across all fields'),
      orderBy: z
        .string()
        .optional()
        .describe(
          'Comma-separated field names/IDs to sort by. Prefix with - for descending, + or nothing for ascending'
        ),
      filterType: z
        .enum(['AND', 'OR'])
        .optional()
        .describe('How multiple filters are combined'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Filter parameters as key-value pairs, e.g. { "filter__field_123__equal": "value" }'
        ),
      viewId: z
        .number()
        .optional()
        .describe("Scope results to only rows matching this view's filters"),
      userFieldNames: z
        .boolean()
        .optional()
        .default(true)
        .describe('Use human-readable field names instead of field IDs'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated list of field names to include in response'),
      exclude: z
        .string()
        .optional()
        .describe('Comma-separated list of field names to exclude from response')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of rows matching the query'),
      next: z.string().nullable().describe('URL to the next page of results'),
      previous: z.string().nullable().describe('URL to the previous page of results'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of row objects with field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listRows({
      tableId: ctx.input.tableId,
      page: ctx.input.page,
      size: ctx.input.size,
      search: ctx.input.search,
      orderBy: ctx.input.orderBy,
      filterType: ctx.input.filterType,
      filters: ctx.input.filters as Record<string, string> | undefined,
      viewId: ctx.input.viewId,
      userFieldNames: ctx.input.userFieldNames,
      include: ctx.input.include,
      exclude: ctx.input.exclude
    });

    let rowCount = result.results?.length ?? 0;

    return {
      output: {
        count: result.count,
        next: result.next,
        previous: result.previous,
        rows: result.results ?? []
      },
      message: `Retrieved **${rowCount}** rows from table ${ctx.input.tableId} (${result.count} total).`
    };
  })
  .build();
