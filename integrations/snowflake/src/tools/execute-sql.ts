import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

let optionalNumber = (value: number | null | undefined) => value ?? undefined;

let columnSchema = z.object({
  name: z.string().describe('Column name'),
  type: z.string().describe('Snowflake data type'),
  nullable: z.boolean().describe('Whether the column allows NULL values'),
  length: z.number().optional().describe('Column length for string types'),
  precision: z.number().optional().describe('Numeric precision'),
  scale: z.number().optional().describe('Numeric scale')
});

export let executeSql = SlateTool.create(spec, {
  name: 'Execute SQL',
  key: 'execute_sql',
  description: `Execute one or more SQL statements against Snowflake and return the results. Supports SELECT queries, DDL (CREATE, ALTER, DROP), and DML (INSERT, UPDATE, DELETE) statements. Multiple statements can be separated by semicolons. Results include column metadata and row data for queries, or affected row counts for DML.`,
  instructions: [
    'Use semicolons to separate multiple SQL statements in a single request.',
    'Set async to true for long-running queries; use the Check Statement Status tool to poll for results.',
    'Bind variables use ? placeholders with corresponding entries in the bindings object.'
  ],
  constraints: [
    'Maximum statement timeout is 604800 seconds (7 days).',
    'Python and Java/Scala stored procedures returning Arrow-format resultsets are not supported.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      statement: z
        .string()
        .describe(
          'SQL statement(s) to execute. Separate multiple statements with semicolons.'
        ),
      database: z
        .string()
        .optional()
        .describe('Target database for this execution. Overrides the default.'),
      schema: z
        .string()
        .optional()
        .describe('Target schema for this execution. Overrides the default.'),
      warehouse: z
        .string()
        .optional()
        .describe('Warehouse to use for this execution. Overrides the default.'),
      role: z
        .string()
        .optional()
        .describe('Role to use for this execution. Overrides the default.'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum execution time in seconds. 0 uses the maximum (604800).'),
      async: z
        .boolean()
        .optional()
        .describe(
          'If true, execute asynchronously and return a statement handle for polling.'
        ),
      bindings: z
        .record(
          z.string(),
          z.object({
            type: z.string().describe('Snowflake data type (e.g. FIXED, TEXT, BOOLEAN, DATE)'),
            value: z.string().describe('String representation of the value')
          })
        )
        .optional()
        .describe(
          'Bind variable values keyed by position (e.g. "1", "2"). Use ? placeholders in the SQL.'
        ),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Session parameters (e.g. multi_statement_count, query_tag, timezone).')
    })
  )
  .output(
    z.object({
      statementHandle: z.string().describe('Unique identifier for the executed statement'),
      status: z.string().describe('Execution status message'),
      columns: z.array(columnSchema).optional().describe('Column metadata for query results'),
      rows: z
        .array(z.array(z.string().nullable()))
        .optional()
        .describe('Result data as arrays of string values'),
      rowCount: z.number().optional().describe('Total number of rows in the result set'),
      stats: z
        .object({
          numRowsInserted: z.number().optional(),
          numRowsUpdated: z.number().optional(),
          numRowsDeleted: z.number().optional(),
          numDuplicateRowsUpdated: z.number().optional()
        })
        .optional()
        .describe('DML statistics for INSERT/UPDATE/DELETE operations'),
      statementHandles: z
        .array(z.string())
        .optional()
        .describe('Handles for individual statements when multiple were submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.executeStatement({
      statement: ctx.input.statement,
      database: ctx.input.database,
      schema: ctx.input.schema,
      warehouse: ctx.input.warehouse || ctx.config.warehouse,
      role: ctx.input.role || ctx.config.role,
      timeout: ctx.input.timeout,
      async: ctx.input.async,
      bindings: ctx.input.bindings,
      parameters: ctx.input.parameters
    });

    let columns = result.resultSetMetaData?.rowType?.map(col => ({
      name: col.name,
      type: col.type,
      nullable: col.nullable,
      length: optionalNumber(col.length),
      precision: optionalNumber(col.precision),
      scale: optionalNumber(col.scale)
    }));

    let rows = result.data?.map(row => row.map(v => v ?? null));

    let isAsync = result.code === '090001';
    let statusMsg = isAsync
      ? `Statement submitted asynchronously. Use handle \`${result.statementHandle}\` to check status.`
      : result.message || 'Statement executed successfully';

    let messageParts = [`**Status**: ${statusMsg}`];
    if (result.resultSetMetaData?.numRows !== undefined) {
      messageParts.push(`**Rows returned**: ${result.resultSetMetaData.numRows}`);
    }
    if (result.stats) {
      if (result.stats.numRowsInserted)
        messageParts.push(`**Rows inserted**: ${result.stats.numRowsInserted}`);
      if (result.stats.numRowsUpdated)
        messageParts.push(`**Rows updated**: ${result.stats.numRowsUpdated}`);
      if (result.stats.numRowsDeleted)
        messageParts.push(`**Rows deleted**: ${result.stats.numRowsDeleted}`);
    }

    return {
      output: {
        statementHandle: result.statementHandle,
        status: statusMsg,
        columns,
        rows,
        rowCount: result.resultSetMetaData?.numRows,
        stats: result.stats,
        statementHandles: result.statementHandles
      },
      message: messageParts.join('\n')
    };
  })
  .build();
