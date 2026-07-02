import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let esqlQueryTool = SlateTool.create(spec, {
  name: 'ES|QL Query',
  key: 'esql_query',
  description: `Execute an ES|QL query to filter, transform, and analyze data stored in Elasticsearch. ES|QL provides a pipe-based query language for powerful data exploration and manipulation.`,
  instructions: [
    'ES|QL queries use a pipe-based syntax, e.g. "FROM logs-* | WHERE status == 200 | STATS count = COUNT(*) BY host"'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The ES|QL query string'),
      columnar: z
        .boolean()
        .optional()
        .describe('If true, returns results in columnar format instead of row-based'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional Query DSL filter to apply before the ES|QL query')
    })
  )
  .output(
    z.object({
      columns: z
        .array(
          z.object({
            name: z.string().describe('Column name'),
            type: z.string().describe('Column data type')
          })
        )
        .describe('Column definitions'),
      values: z.array(z.array(z.any())).optional().describe('Row-based result values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let params: Record<string, any> = {};
    if (ctx.input.columnar !== undefined) params.columnar = ctx.input.columnar;
    if (ctx.input.filter) params.filter = ctx.input.filter;

    let result = await client.esql(ctx.input.query, params);

    return {
      output: {
        columns: result.columns || [],
        values: result.values
      },
      message: `ES|QL query executed. Returned **${(result.values || []).length}** rows across **${(result.columns || []).length}** columns.`
    };
  })
  .build();
