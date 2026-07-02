import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let executeSql = SlateTool.create(spec, {
  name: 'Execute SQL',
  key: 'execute_sql',
  description: `Execute a SQL statement on a SQL warehouse and return the results. Supports catalog and schema context, and can wait for completion or return a statement ID for asynchronous polling.`,
  instructions: [
    'Provide a warehouseId to specify which SQL warehouse to use.',
    'Optionally set catalog and schema to scope the query.',
    'For long-running queries, use a short waitTimeout and poll using the returned statementId.'
  ]
})
  .input(
    z.object({
      warehouseId: z.string().describe('SQL warehouse ID to execute against'),
      statement: z.string().describe('SQL statement to execute'),
      catalog: z.string().optional().describe('Catalog context for the query'),
      schema: z.string().optional().describe('Schema context for the query'),
      waitTimeout: z
        .string()
        .optional()
        .describe('Max wait time (e.g., "50s"). Use "0s" for async.')
    })
  )
  .output(
    z.object({
      statementId: z.string().describe('Statement execution ID'),
      status: z.string().describe('Execution status (SUCCEEDED, RUNNING, FAILED, etc.)'),
      rowCount: z.number().optional().describe('Number of rows returned'),
      columns: z
        .array(
          z.object({
            name: z.string().describe('Column name'),
            typeName: z.string().describe('Column type')
          })
        )
        .optional()
        .describe('Column schema of the result'),
      rows: z
        .array(z.array(z.string().nullable()))
        .optional()
        .describe('Result data rows (array of arrays)'),
      errorMessage: z.string().optional().describe('Error message if execution failed'),
      truncated: z.boolean().optional().describe('Whether the result was truncated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let result = await client.executeStatement({
      warehouseId: ctx.input.warehouseId,
      statement: ctx.input.statement,
      catalog: ctx.input.catalog,
      schema: ctx.input.schema,
      waitTimeout: ctx.input.waitTimeout
    });

    let status = result.status?.state ?? 'UNKNOWN';
    let columns = (result.manifest?.schema?.columns ?? []).map((c: any) => ({
      name: c.name,
      typeName: c.type_name ?? c.type_text ?? ''
    }));
    let rows = result.result?.data_array ?? [];
    let rowCount = result.manifest?.total_row_count ?? rows.length;
    let truncated = result.manifest?.truncated ?? false;
    let errorMessage = result.status?.error?.message;

    return {
      output: {
        statementId: result.statement_id ?? '',
        status,
        rowCount,
        columns: columns.length > 0 ? columns : undefined,
        rows: rows.length > 0 ? rows : undefined,
        errorMessage,
        truncated: truncated || undefined
      },
      message:
        status === 'SUCCEEDED'
          ? `Query completed. **${rowCount}** row(s) returned.${truncated ? ' (truncated)' : ''}`
          : status === 'FAILED'
            ? `Query failed: ${errorMessage ?? 'Unknown error'}`
            : `Query status: **${status}**. Statement ID: ${result.statement_id}`
    };
  })
  .build();
