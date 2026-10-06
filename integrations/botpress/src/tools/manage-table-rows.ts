import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { botIdSchema, resolveBotId } from '../lib/schemas';
import { spec } from '../spec';

export let manageTableRowsTool = SlateTool.create(spec, {
  name: 'Manage Table Rows',
  key: 'manage_table_rows',
  description: `Create, read, update, delete, upsert, or search rows in a Botpress table. Use **find** for filtered or semantic search queries. Use **upsert** for idempotent inserts using a key column. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
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
      botId: botIdSchema,
      tableId: z.string().describe('Table ID or name'),
      rowId: z
        .number()
        .int()
        .min(0)
        .max(2147483647)
        .optional()
        .describe('Row ID (required for get action)'),
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .max(1000)
        .optional()
        .describe('Array of row objects (for create, update, upsert)'),
      keyColumn: z.string().optional().describe('Column to match on for upsert'),
      filter: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter object for find or delete, e.g. { "column": { "$eq": "value" } }'),
      search: z.string().max(1024).optional().describe('Semantic search query for find'),
      select: z.array(z.string()).optional().describe('Columns to return for find'),
      orderBy: z.string().optional().describe('Column to sort by for find'),
      orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction for find'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of rows to return for find (max 1000)'),
      offset: z.number().int().min(0).optional().describe('Offset for pagination in find'),
      deleteIds: z
        .array(z.number().int().min(0).max(2147483647))
        .min(1)
        .max(1000)
        .optional()
        .describe('Row IDs to delete'),
      deleteAll: z.boolean().optional().describe('Delete all rows in the table (irreversible)')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.unknown())).optional(),
      row: z.record(z.string(), z.unknown()).optional(),
      hasMore: z.boolean().optional(),
      deleted: z.boolean().optional(),
      warnings: z.array(z.string()).optional(),
      errors: z.array(z.string()).optional(),
      inserted: z.array(z.record(z.string(), z.unknown())).optional(),
      updated: z.array(z.record(z.string(), z.unknown())).optional(),
      offset: z.number().optional(),
      limit: z.number().optional(),
      deletedRows: z.number().optional(),
      job: z.object({ id: z.string(), status: z.string() }).optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = resolveBotId(ctx.input.botId, ctx.config);

    let client = new TablesClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'create') {
      if (!ctx.input.rows?.length)
        throw createApiServiceError('rows are required for create action');
      let result = await client.createRows(ctx.input.tableId, ctx.input.rows);
      return {
        output: { rows: result.rows, warnings: result.warnings, errors: result.errors },
        message: `Created **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}**.${result.errors?.length ? ` **${result.errors.length}** row error(s) were reported; inspect errors before retrying.` : ''}`
      };
    }

    if (ctx.input.action === 'get') {
      if (ctx.input.rowId === undefined)
        throw createApiServiceError('rowId is required for get action');
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
          warnings: result.warnings,
          offset: result.offset,
          limit: result.limit
        },
        message: `Found **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}**.${result.hasMore ? ' More results available.' : ''}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.rows?.length)
        throw createApiServiceError(
          'rows are required for update action (each row must include an id)'
        );
      if (
        ctx.input.rows.some(
          row => !Number.isInteger(row.id) || Number(row.id) < 0 || Number(row.id) > 2147483647
        )
      )
        throw createApiServiceError(
          'Every update row must include an integer id from 0 to 2147483647.'
        );
      let result = await client.updateRows(ctx.input.tableId, ctx.input.rows);
      return {
        output: { rows: result.rows, warnings: result.warnings, errors: result.errors },
        message: `Updated **${result.rows?.length || 0}** row(s) in table **${ctx.input.tableId}**.${result.errors?.length ? ` **${result.errors.length}** row error(s) were reported; inspect errors before retrying.` : ''}`
      };
    }

    if (ctx.input.action === 'upsert') {
      if (!ctx.input.rows?.length)
        throw createApiServiceError('rows are required for upsert action');
      if (!ctx.input.keyColumn)
        throw createApiServiceError('keyColumn is required for upsert action');
      let result = await client.upsertRows(
        ctx.input.tableId,
        ctx.input.rows,
        ctx.input.keyColumn
      );
      return {
        output: {
          rows: [...(result.inserted ?? []), ...(result.updated ?? [])],
          inserted: result.inserted,
          updated: result.updated,
          warnings: result.warnings,
          errors: result.errors
        },
        message: `Inserted **${result.inserted?.length || 0}** and updated **${result.updated?.length || 0}** row(s) in table **${ctx.input.tableId}** using key column **${ctx.input.keyColumn}**.${result.errors?.length ? ` **${result.errors.length}** row error(s) were reported; inspect errors before retrying.` : ''}`
      };
    }

    if (ctx.input.action === 'delete') {
      const selectors = [
        ctx.input.deleteIds !== undefined,
        ctx.input.filter !== undefined,
        ctx.input.deleteAll === true
      ];
      if (selectors.filter(Boolean).length !== 1)
        throw createApiServiceError(
          'Provide exactly one of deleteIds, filter, or deleteAll for delete.'
        );
      if (ctx.input.filter && Object.keys(ctx.input.filter).length === 0)
        throw createApiServiceError(
          'An empty delete filter is unsafe. Use deleteAll: true to explicitly delete all rows.'
        );
      let deleteOpts: {
        ids?: number[];
        filter?: Record<string, unknown>;
        deleteAllRows?: boolean;
      } = {};
      if (ctx.input.deleteIds) deleteOpts.ids = ctx.input.deleteIds;
      else if (ctx.input.filter) deleteOpts.filter = ctx.input.filter;
      else if (ctx.input.deleteAll) deleteOpts.deleteAllRows = true;
      else
        throw createApiServiceError(
          'Provide deleteIds, filter, or deleteAll for delete action'
        );

      const result = await client.deleteRows(ctx.input.tableId, deleteOpts);
      return {
        output: { deleted: !result.job, deletedRows: result.deletedRows, job: result.job },
        message: result.job
          ? `Started row deletion job **${result.job.id}** for table **${ctx.input.tableId}**.`
          : `Deleted **${result.deletedRows}** row(s) from table **${ctx.input.tableId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
