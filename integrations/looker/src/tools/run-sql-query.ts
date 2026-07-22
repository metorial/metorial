import { createApiServiceError, createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let runSqlQuery = SlateTool.create(spec, {
  name: 'Run SQL Query',
  key: 'run_sql_query',
  description: `Execute raw SQL using Looker's SQL Runner. Provide either a database connection name or a LookML model name, plus the exact SQL statement. SQL can mutate the underlying database; use SELECT statements for read-only access. JSON results are returned inline, while CSV and TXT results are returned as attachments.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      connectionName: z
        .string()
        .min(1)
        .optional()
        .describe('Database connection name; required when modelName is not provided'),
      sql: z.string().min(1).describe('The exact SQL statement to execute'),
      modelName: z
        .string()
        .min(1)
        .optional()
        .describe('LookML model name; required when connectionName is not provided'),
      resultFormat: z
        .enum(['json', 'csv', 'txt'])
        .optional()
        .describe('Output format (default "json"); CSV and TXT are returned as attachments')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Unique slug identifier of the created SQL query'),
      results: z.any().describe('Query results or attachment metadata')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.connectionName === undefined && ctx.input.modelName === undefined) {
      throw createApiServiceError('Provide either connectionName or modelName.', {
        reason: 'looker_sql_query_target_required'
      });
    }

    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let sqlQuery = await client.createSqlQuery({
      connection_name: ctx.input.connectionName,
      sql: ctx.input.sql,
      model_name: ctx.input.modelName
    });

    if (typeof sqlQuery.slug !== 'string' || sqlQuery.slug.length === 0) {
      throw createApiServiceError('Looker did not return a slug for the SQL Runner query.', {
        reason: 'looker_sql_query_slug_missing'
      });
    }

    let format = ctx.input.resultFormat ?? 'json';
    let queryResult = await client.runSqlQuery(sqlQuery.slug, format);
    let target =
      ctx.input.connectionName !== undefined
        ? `connection **${ctx.input.connectionName}**`
        : `model **${ctx.input.modelName}**`;

    return {
      output: { slug: sqlQuery.slug, results: queryResult.results },
      attachments: queryResult.attachment
        ? [
            createBase64Attachment(
              queryResult.attachment.contentBase64,
              queryResult.attachment.mimeType
            )
          ]
        : undefined,
      message: `SQL query executed using ${target}.`
    };
  })
  .build();
