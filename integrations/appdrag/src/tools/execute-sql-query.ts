import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let executeSqlQuery = SlateTool.create(spec, {
  name: 'Execute SQL Query',
  key: 'execute_sql_query',
  description: `Execute a SQL query against the AppDrag Cloud Database (MySQL-compatible). Supports both read queries (SELECT) and write queries (INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, etc.).
Use this tool to interact directly with the cloud database for data retrieval, manipulation, and schema management.`,
  instructions: [
    'For SELECT queries, use queryType "select". For all other queries (INSERT, UPDATE, DELETE, CREATE TABLE, etc.), use queryType "execute".',
    'The cloud database is 100% MySQL-compatible. Use standard MySQL syntax.',
    'Be careful with destructive queries (DROP, DELETE, TRUNCATE) as they cannot be undone.'
  ],
  constraints: [
    'Query execution time is billed per millisecond with a minimum of 100ms per operation.',
    'Rate limiting applies based on the number of API queries per minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      query: z.string().describe('The SQL query to execute. Must be valid MySQL syntax.'),
      queryType: z
        .enum(['select', 'execute'])
        .describe(
          'Use "select" for SELECT queries that return data. Use "execute" for INSERT, UPDATE, DELETE, CREATE TABLE, and other non-select queries.'
        )
    })
  )
  .output(
    z.object({
      results: z
        .any()
        .describe(
          'Query results. For SELECT queries, an array of rows. For execute queries, status information including affected rows.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let results: any;

    if (ctx.input.queryType === 'select') {
      results = await client.sqlSelect(ctx.input.query);
    } else {
      results = await client.sqlExecuteRawQuery(ctx.input.query);
    }

    return {
      output: {
        results
      },
      message: `SQL query executed successfully (type: ${ctx.input.queryType}).`
    };
  })
  .build();
