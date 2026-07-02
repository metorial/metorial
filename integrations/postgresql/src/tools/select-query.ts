import { createApiServiceError, SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let normalizeSelectSql = (inputSql: string) => {
  let sql = inputSql.trim();

  if (sql.length === 0) {
    throw createApiServiceError('sql must be a non-empty SELECT statement.');
  }

  if (sql.includes('\0')) {
    throw createApiServiceError('sql must not contain null bytes.');
  }

  sql = sql.replace(/;\s*$/, '');

  if (sql.length === 0) {
    throw createApiServiceError('sql must be a non-empty SELECT statement.');
  }

  if (sql.includes(';')) {
    throw createApiServiceError('select_query only accepts a single SELECT statement.');
  }

  if (!/^(SELECT|WITH)\b/i.test(sql)) {
    throw createApiServiceError('select_query only accepts SELECT statements.');
  }

  return sql;
};

export let selectQuery = SlateTool.create(spec, {
  name: 'Select Query',
  key: 'select_query',
  description: `Run a read-only SELECT query against the PostgreSQL database. Use this tool for data retrieval, reporting, analytics, joins, subqueries, read-only CTEs, window functions, and aggregations.
Rejects non-SELECT SQL and runs inside a PostgreSQL READ ONLY transaction so data-changing statements are blocked.
Use execute_query only when you intentionally need broader SQL operations such as INSERT, UPDATE, DELETE, CREATE, ALTER, or DROP.`,
  instructions: [
    'Use this tool for read-only data retrieval requests.',
    'Use execute_query instead when the user explicitly asks to modify database state or run DDL.',
    'For large result sets, use LIMIT to control the number of returned rows.'
  ],
  constraints: [
    'Only one SELECT or WITH statement is accepted.',
    'Query execution is subject to the configured timeout.',
    'Results are limited by the configured maxRows setting when no explicit LIMIT is provided.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sql: z.string().describe('Single SELECT or read-only WITH query to execute'),
      maxRows: z
        .number()
        .optional()
        .describe('Maximum number of rows to return. Overrides the default maxRows config.')
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
      rowCount: z.number().nullable().describe('Number of rows returned'),
      command: z.string().describe('The SQL command that was executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let sql = normalizeSelectSql(ctx.input.sql);
    let maxRows = ctx.input.maxRows ?? ctx.config.maxRows;
    let hasLimit = /\bLIMIT\s+\d+/i.test(sql);

    let querySql = sql;
    if (!hasLimit && maxRows > 0) {
      querySql = `${querySql} LIMIT ${maxRows}`;
    }

    ctx.info(
      `Executing read-only SQL query: ${querySql.substring(0, 200)}${querySql.length > 200 ? '...' : ''}`
    );

    let results = await client.multiQuery(
      ['START TRANSACTION READ ONLY', querySql, 'COMMIT'],
      ctx.config.queryTimeout
    );
    let result = results[1];

    if (!result) {
      throw createApiServiceError('PostgreSQL did not return a result for the SELECT query.');
    }

    let displayColumns = result.columns.map(c => ({ name: c.name, type: c.type }));

    return {
      output: {
        columns: displayColumns,
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command
      },
      message: `Query returned **${result.rows.length}** row(s) with **${result.columns.length}** column(s).`
    };
  })
  .build();
