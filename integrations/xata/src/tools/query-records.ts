import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let queryRecords = SlateTool.create(spec, {
  name: 'Query Records',
  key: 'query_records',
  description: `Query and filter records from a Xata table. Supports filtering with operators, sorting, column selection, and cursor-based pagination. Use this to retrieve records matching specific criteria or to list all records in a table.`,
  instructions: [
    'Filters use Xata filter syntax, e.g. {"column": {"$gt": 5}} or {"column": {"$contains": "text"}}.',
    'Sort can be a single object or array of objects, e.g. {"column": "asc"} or [{"column": "asc"}, {"other": "desc"}].',
    'Pagination uses cursor-based approach. Pass the cursor from a previous response to get the next page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table to query'),
      filter: z
        .any()
        .optional()
        .describe(
          'Filter object using Xata filter syntax, e.g. {"status": {"$is": "active"}}'
        ),
      sort: z
        .any()
        .optional()
        .describe('Sort specification, e.g. {"createdAt": "desc"} or [{"name": "asc"}]'),
      columns: z
        .array(z.string())
        .optional()
        .describe('List of column names to return. Returns all columns if omitted.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of records per page (max 200, default 20)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous query response'),
      consistency: z
        .enum(['strong', 'eventual'])
        .optional()
        .describe(
          'Read consistency level. "strong" uses primary store, "eventual" uses read replica.'
        )
    })
  )
  .output(
    z.object({
      records: z.array(z.any()).describe('Array of matching records'),
      meta: z
        .object({
          cursor: z.string().optional().describe('Cursor for fetching the next page'),
          hasMore: z.boolean().optional().describe('Whether more records are available')
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;
    let dbName = ctx.input.databaseName;

    let page: any;
    if (ctx.input.pageSize || ctx.input.cursor) {
      page = {};
      if (ctx.input.pageSize) page.size = ctx.input.pageSize;
      if (ctx.input.cursor) page.after = ctx.input.cursor;
    }

    let result = await client.queryTable(dbName, branch, ctx.input.tableName, {
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      columns: ctx.input.columns,
      page,
      consistency: ctx.input.consistency
    });

    let records = result.records || [];
    let meta = result.meta?.page
      ? {
          cursor: result.meta.page.cursor,
          hasMore: result.meta.page.more
        }
      : undefined;

    return {
      output: { records, meta },
      message: `Retrieved **${records.length}** record(s) from **${ctx.input.tableName}**${meta?.hasMore ? ' (more pages available)' : ''}.`
    };
  })
  .build();
