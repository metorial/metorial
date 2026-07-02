import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

export let runSql = SlateTool.create(spec, {
  name: 'Run SQL Query',
  key: 'run_sql',
  description: `Execute a read-only SQL SELECT query against a document's SQLite database. Supports parameterized queries to prevent SQL injection. Only SELECT statements are allowed.`,
  instructions: [
    'Use "?" placeholders in the SQL query and pass values in the "args" array for parameterized queries.',
    'Only SELECT statements are supported. INSERT, UPDATE, DELETE and other modification statements are not allowed.'
  ],
  constraints: ['Only read-only SELECT queries are permitted.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      sql: z.string().describe('SQL SELECT query to execute'),
      args: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe('Query parameters for "?" placeholders'),
      timeout: z.number().optional().describe('Query timeout in milliseconds')
    })
  )
  .output(
    z.object({
      statement: z.string().describe('The executed SQL statement'),
      columns: z.array(z.string()).optional().describe('Column names in the result set'),
      rows: z.array(z.array(z.any())).optional().describe('Result rows as arrays of values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.runSql(
      ctx.input.documentId,
      ctx.input.sql,
      ctx.input.args,
      ctx.input.timeout
    );

    let rowCount = result.records?.length || result.rows?.length || 0;

    return {
      output: {
        statement: result.statement || ctx.input.sql,
        columns: result.columns,
        rows: result.rows
      },
      message: `Query returned **${rowCount}** row(s).`
    };
  })
  .build();
