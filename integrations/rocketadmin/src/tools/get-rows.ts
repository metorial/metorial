import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let getRows = SlateTool.create(spec, {
  name: 'Get Table Rows',
  key: 'get_rows',
  description: `Retrieve rows from a database table. Supports pagination, sorting, search, and filtering. Use filters to query specific data subsets. Can also fetch a single row by primary key.`,
  instructions: [
    'Provide connectionId and tableName to get rows.',
    'Use primaryKey to fetch a specific row by its primary key values.',
    'Use filters as key-value pairs to filter results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z.string().describe('Name of the table to query'),
      primaryKey: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Primary key to fetch a specific row (e.g., {"id": 1})'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of rows per page'),
      search: z.string().optional().describe('Search query to filter rows'),
      sortField: z.string().optional().describe('Column name to sort by'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter conditions for querying rows'),
      masterPassword: z
        .string()
        .optional()
        .describe('Master password if the connection uses client-side encryption')
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Retrieved table rows'),
      row: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single row when fetched by primary key'),
      pagination: z
        .object({
          total: z.number().optional().describe('Total number of rows'),
          page: z.number().optional().describe('Current page number'),
          perPage: z.number().optional().describe('Rows per page')
        })
        .optional()
        .describe('Pagination info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      masterPassword: ctx.input.masterPassword
    });

    if (ctx.input.primaryKey) {
      let row = await client.getRowByPrimaryKey(
        ctx.input.connectionId,
        ctx.input.tableName,
        ctx.input.primaryKey
      );
      return {
        output: { row },
        message: `Retrieved row from **${ctx.input.tableName}**.`
      };
    }

    if (ctx.input.filters) {
      let result = await client.findRows(
        ctx.input.connectionId,
        ctx.input.tableName,
        ctx.input.filters,
        {
          page: ctx.input.page,
          perPage: ctx.input.perPage,
          sortField: ctx.input.sortField,
          sortOrder: ctx.input.sortOrder
        }
      );

      let rows = Array.isArray(result)
        ? result
        : (result.rows as Record<string, unknown>[]) || [];
      let pagination = !Array.isArray(result)
        ? {
            total: result.total_count as number | undefined,
            page: ctx.input.page,
            perPage: ctx.input.perPage
          }
        : undefined;

      return {
        output: { rows, pagination },
        message: `Found **${rows.length}** row(s) matching filters in **${ctx.input.tableName}**.`
      };
    }

    let result = await client.getRows(ctx.input.connectionId, ctx.input.tableName, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      search: ctx.input.search,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let rows = Array.isArray(result)
      ? result
      : (result.rows as Record<string, unknown>[]) || [];
    let pagination = !Array.isArray(result)
      ? {
          total: result.total_count as number | undefined,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        }
      : undefined;

    return {
      output: { rows, pagination },
      message: `Retrieved **${rows.length}** row(s) from **${ctx.input.tableName}**.`
    };
  })
  .build();
