import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let runQuery = SlateTool.create(spec, {
  name: 'Run Query',
  key: 'run_query',
  description: `Run an inline query against a LookML model and retrieve results. Specify the model, explore (view), fields, filters, sorts, and limits to build a query on the fly. Results are returned in JSON format. Use this to programmatically extract data from your Looker models without needing to save a Look first.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('LookML model name'),
      view: z.string().describe('Explore (view) name within the model'),
      fields: z
        .array(z.string())
        .describe('Fields to select (e.g., ["users.name", "orders.count"])'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Filter expressions keyed by field name (e.g., {"users.state": "California"})'
        ),
      sorts: z
        .array(z.string())
        .optional()
        .describe('Sort expressions (e.g., ["orders.count desc"])'),
      limit: z
        .string()
        .optional()
        .describe('Maximum number of rows to return (default "500")'),
      pivots: z.array(z.string()).optional().describe('Fields to pivot on'),
      total: z.boolean().optional().describe('Whether to include totals'),
      queryTimezone: z
        .string()
        .optional()
        .describe('Timezone for the query (e.g., "America/Los_Angeles")'),
      resultFormat: z
        .enum(['json', 'json_detail', 'csv', 'txt', 'html', 'md', 'xlsx', 'sql'])
        .optional()
        .describe('Output format for results (default "json")')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Query results in the requested format'),
      sql: z.string().optional().describe('Generated SQL query (only for json_detail format)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let format = ctx.input.resultFormat || 'json';

    let results = await client.runInlineQuery(
      {
        model: ctx.input.model,
        view: ctx.input.view,
        fields: ctx.input.fields,
        filters: ctx.input.filters,
        sorts: ctx.input.sorts,
        limit: ctx.input.limit,
        pivots: ctx.input.pivots,
        total: ctx.input.total,
        query_timezone: ctx.input.queryTimezone
      },
      format
    );

    let sql: string | undefined;
    if (format === 'json_detail' && results?.sql) {
      sql = results.sql;
    }

    let rowCount = Array.isArray(results)
      ? results.length
      : results?.data
        ? results.data.length
        : undefined;

    return {
      output: { results, sql },
      message: `Query executed on **${ctx.input.model}/${ctx.input.view}**${rowCount !== undefined ? ` returning ${rowCount} rows` : ''}.`
    };
  })
  .build();
