import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let manageTableRowsTool = SlateTool.create(spec, {
  name: 'Manage Table Rows',
  key: 'manage_table_rows',
  description: `Create, read, update, delete, upsert, or search rows in a Botpress table. Use **find** for filtered or semantic search queries. Use **upsert** for idempotent inserts using a key column.`,
  instructions: [
    'For find, use filter with operators like $eq, $ne, $gt, $gte, $lt, $lte on column values.',
    'For semantic search, provide a "search" string in the find action.',
    'For upsert, provide a keyColumn to match existing rows by.'
  ],
  constraints: ['Maximum 1000 rows per create, update, upsert, or delete operation.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'find', 'update', 'delete', 'upsert'])
        .describe('Operation to perform'),
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      tableId: z.string().describe('Table ID or name'),
      rowId: z.number().optional().describe('Row ID (required for get action)'),
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of row objects (for create, update, upsert)'),
      keyColumn: z.string().optional().describe('Column to match on for upsert'),
      filter: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter object for find or delete, e.g. { "column": { "$eq": "value" } }'),
      search: z.string().optional().describe('Semantic search query for find'),
      select: z.array(z.string()).optional().describe('Columns to return for find'),
      orderBy: z.string().optional().describe('Column to sort by for find'),
      orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction for find'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of rows to return for find (max 1000)'),
      offset: z.number().optional().describe('Offset for pagination in find'),
      deleteIds: z.array(z.number()).optional().describe('Row IDs to delete'),
      deleteAll: z.boolean().optional().describe('Delete all rows in the table (irreversible)')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.unknown())).optional(),
      row: z.record(z.string(), z.unknown()).optional(),
      hasMore: z.boolean().optional(),
      deleted: z.boolean().optional(),
      warnings: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new TablesClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'create') {
      if (!ctx.input.rows?.length) throw new Error('rows are required for create action');
      let result = await client.createRows(ctx.input.tableId, ctx.input.rows);
      return {
        output: { rows: result.rows, warnings: result.warnings },
        message: `Created **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (ctx.input.rowId === undefined) throw new Error('rowId is required for get action');
      let result = await client.getRow(ctx.input.tableId, ctx.input.rowId);
      return {
        output: { row: result.row },
        message: `Retrieved row **${ctx.input.rowId}** from table **${ctx.input.tableId}**.`
      };
    }

    if (ctx.input.action === 'find') {
      let result = await client.findRows(ctx.input.tableId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        filter: ctx.input.filter,
        search: ctx.input.search,
        select: ctx.input.select,
        orderBy: ctx.input.orderBy,
        orderDirection: ctx.input.orderDirection
      });
      return {
        output: {
          rows: result.rows,
          hasMore: result.hasMore,
          warnings: result.warnings
        },
        message: `Found **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}**.${result.hasMore ? ' More results available.' : ''}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.rows?.length)
        throw new Error('rows are required for update action (each row must include an id)');
      let result = await client.updateRows(ctx.input.tableId, ctx.input.rows);
      return {
        output: { rows: result.rows, warnings: result.warnings },
        message: `Updated **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}**.`
      };
    }

    if (ctx.input.action === 'upsert') {
      if (!ctx.input.rows?.length) throw new Error('rows are required for upsert action');
      if (!ctx.input.keyColumn) throw new Error('keyColumn is required for upsert action');
      let result = await client.upsertRows(
        ctx.input.tableId,
        ctx.input.rows,
        ctx.input.keyColumn
      );
      return {
        output: { rows: result.rows, warnings: result.warnings },
        message: `Upserted **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}** using key column **${ctx.input.keyColumn}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let deleteOpts: {
        ids?: number[];
        filter?: Record<string, unknown>;
        deleteAllRows?: boolean;
      } = {};
      if (ctx.input.deleteIds) deleteOpts.ids = ctx.input.deleteIds;
      else if (ctx.input.filter) deleteOpts.filter = ctx.input.filter;
      else if (ctx.input.deleteAll) deleteOpts.deleteAllRows = true;
      else throw new Error('Provide deleteIds, filter, or deleteAll for delete action');

      await client.deleteRows(ctx.input.tableId, deleteOpts);
      return {
        output: { deleted: true },
        message: `Deleted rows from table **${ctx.input.tableId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
