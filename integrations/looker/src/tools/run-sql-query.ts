import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let runSqlQuery = SlateTool.create(spec, {
  name: 'Run SQL Query',
  key: 'run_sql_query',
  description: `Execute raw SQL against a database connection using Looker's SQL Runner. Provide the connection name and SQL statement to run arbitrary queries. Results are returned in JSON format.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionName: z.string().describe('Name of the database connection to use'),
      sql: z.string().describe('The SQL query to execute'),
      modelName: z
        .string()
        .optional()
        .describe('LookML model name for model-level permissions'),
      resultFormat: z
        .enum(['json', 'csv', 'txt'])
        .optional()
        .describe('Output format (default "json")')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Unique slug identifier of the created SQL query'),
      results: z.any().describe('Query results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let sqlQuery = await client.createSqlQuery({
      connection_name: ctx.input.connectionName,
      sql: ctx.input.sql,
      model_name: ctx.input.modelName
    });

    let format = ctx.input.resultFormat || 'json';
    let results = await client.runSqlQuery(sqlQuery.slug, format);

    return {
      output: { slug: sqlQuery.slug, results },
      message: `SQL query executed on connection **${ctx.input.connectionName}**.`
    };
  })
  .build();
