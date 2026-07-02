import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute SQL Query',
  key: 'execute_query',
  description: `Execute an arbitrary SQL query against the PostgreSQL database. Supports all SQL operations including SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, and more.
Returns column metadata and result rows for SELECT queries, or affected row counts for DML statements.
Supports complex queries with joins, subqueries, CTEs, window functions, and aggregations.`,
  instructions: [
    'Always validate SQL syntax before executing to avoid errors.',
    'Use parameterized-style quoting for user-provided values to prevent SQL injection.',
    'For large result sets, use LIMIT to control the number of returned rows.'
  ],
  constraints: [
    'Query execution is subject to the configured timeout.',
    'Results are limited by the configured maxRows setting when no explicit LIMIT is provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sql: z.string().describe('The SQL query to execute'),
      maxRows: z
        .number()
        .optional()
        .describe(
          'Maximum number of rows to return. Overrides the default maxRows config. Only applicable for SELECT queries.'
        )
    })
  )
  .output(
    z.object({
      columns: z
        .array(
          z.object({
            name: z.string().describe('Column name'),
            type: z.string().describe('PostgreSQL data type')
          })
        )
        .describe('Column metadata for the result set'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe('Result rows as key-value objects'),
      rowCount: z
        .number()
        .nullable()
        .describe('Number of rows affected (for DML) or returned'),
      command: z
        .string()
        .describe('The SQL command that was executed (e.g., SELECT, INSERT, UPDATE)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let sql = ctx.input.sql.trim();
    let maxRows = ctx.input.maxRows ?? ctx.config.maxRows;

    // If it's a SELECT query without LIMIT, add one
    let isSelect = /^\s*(SELECT|WITH)\b/i.test(sql);
    let hasLimit = /\bLIMIT\s+\d+/i.test(sql);

    let querySql = sql;
    if (isSelect && !hasLimit && maxRows > 0) {
      // Remove trailing semicolon if present before adding LIMIT
      querySql = querySql.replace(/;\s*$/, '');
      querySql = `${querySql} LIMIT ${maxRows}`;
    }

    ctx.info(
      `Executing SQL query: ${querySql.substring(0, 200)}${querySql.length > 200 ? '...' : ''}`
    );

    let result = await client.query(querySql, ctx.config.queryTimeout);

    let displayColumns = result.columns.map(c => ({ name: c.name, type: c.type }));

    return {
      output: {
        columns: displayColumns,
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command
      },
      message: isSelect
        ? `Query returned **${result.rows.length}** row(s) with **${result.columns.length}** column(s).`
        : `\`${result.command}\` completed. **${result.rowCount ?? 0}** row(s) affected.`
    };
  })
  .build();
