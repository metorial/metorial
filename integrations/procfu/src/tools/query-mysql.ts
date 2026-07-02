import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let queryMysql = SlateTool.create(spec, {
  name: 'Query MySQL',
  key: 'query_mysql',
  description: `Execute a MySQL query through ProcFu's connected MySQL database. Supports parameterized queries with \`?\` placeholders.
- **query**: Returns a single result row.
- **array**: Returns multiple result rows.
- **command**: Executes a non-SELECT statement (INSERT, UPDATE, DELETE, etc.).

Optionally specify a connection name if multiple MySQL databases are configured.`,
  instructions: [
    'Use ? placeholders in SQL and pass parameters as a JSON array to prevent SQL injection.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      queryType: z
        .enum(['query', 'array', 'command'])
        .describe(
          'Type of query: "query" for single row, "array" for multiple rows, "command" for non-SELECT'
        ),
      sql: z.string().describe('SQL statement with ? placeholders for parameters'),
      params: z
        .array(z.any())
        .optional()
        .describe('Array of parameter values matching the ? placeholders in order'),
      connectionName: z
        .string()
        .optional()
        .describe('Named MySQL connection (if multiple are configured)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The query result(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let paramsStr = ctx.input.params ? JSON.stringify(ctx.input.params) : undefined;

    let result: any;
    if (ctx.input.queryType === 'query') {
      result = await client.mysqlQuery(ctx.input.sql, paramsStr, ctx.input.connectionName);
    } else if (ctx.input.queryType === 'array') {
      result = await client.mysqlArray(ctx.input.sql, paramsStr, ctx.input.connectionName);
    } else {
      result = await client.mysqlCommand(ctx.input.sql, paramsStr, ctx.input.connectionName);
    }

    return {
      output: { result },
      message: `Executed MySQL ${ctx.input.queryType} successfully.`
    };
  })
  .build();
