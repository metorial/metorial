import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let executeTransaction = SlateTool.create(spec, {
  name: 'Execute Transaction',
  key: 'execute_transaction',
  description: `DEPRECATED — Xata Lite was permanently retired on February 28, 2026. This legacy operation is unavailable. Discover current organizations with list_organizations and use the current project/branch tools for platform management; data access uses native PostgreSQL. Legacy contract: Execute multiple record operations (insert, update, delete, get) as a single atomic transaction. All operations succeed together or fail together, ensuring data consistency.`,
  instructions: [
    'Xata Lite is retired. Use list_organizations, list_projects and the current project branch tools for platform management. Use a native PostgreSQL client for record, schema, search and transaction work; this legacy key is not remapped.',
    'Each operation requires a "type" ("insert", "update", "delete", or "get"), a "table" name, and type-specific fields.',
    'Insert: requires "record" (object with field values), optionally "id" to set a custom record ID.',
    'Update: requires "id" and "fields" (object with updated values).',
    'Delete: requires "id".',
    'Get: requires "id", optionally "columns" (array of column names).'
  ],
  tags: {
    deprecated: true,
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      operations: z
        .array(
          z.object({
            type: z.enum(['insert', 'update', 'delete', 'get']).describe('Type of operation'),
            table: z.string().describe('Table name for this operation'),
            recordId: z
              .string()
              .optional()
              .describe('Record ID (required for update, delete, get)'),
            record: z
              .record(z.string(), z.any())
              .optional()
              .describe('Record data (for insert operations)'),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Fields to update (for update operations)'),
            columns: z
              .array(z.string())
              .optional()
              .describe('Columns to return (for get operations)')
          })
        )
        .describe('Array of operations to execute atomically')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Results for each operation in order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let operations = ctx.input.operations.map(op => {
      let base: any = { [op.type]: { table: op.table } };
      if (op.type === 'insert') {
        base.insert.record = op.record || {};
        if (op.recordId) base.insert.record.id = op.recordId;
      } else if (op.type === 'update') {
        base.update.id = op.recordId;
        base.update.fields = op.fields || {};
      } else if (op.type === 'delete') {
        base.delete.id = op.recordId;
      } else if (op.type === 'get') {
        base.get.id = op.recordId;
        if (op.columns) base.get.columns = op.columns;
      }
      return base;
    });

    let result = await client.executeTransaction(ctx.input.databaseName, branch, operations);

    return {
      output: { results: result.results || [] },
      message: `Executed transaction with **${ctx.input.operations.length}** operation(s).`
    };
  })
  .build();
