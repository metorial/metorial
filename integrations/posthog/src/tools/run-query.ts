import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let runQueryTool = SlateTool.create(spec, {
  name: 'Run HogQL Query',
  key: 'run_query',
  description: `Execute an ad-hoc HogQL query against your PostHog data. HogQL is PostHog's SQL-like query language that supports querying events, persons, sessions, and more.
Use this for custom analytics queries, aggregations, and data exploration that go beyond predefined insights.`,
  instructions: [
    'The query object must follow PostHog\'s query node format. For a simple HogQL query, use: `{ "kind": "HogQLQuery", "query": "SELECT ... FROM events LIMIT 100" }`.',
    'Common tables: events, persons, sessions, groups.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .record(z.string(), z.any())
        .describe(
          'HogQL query object (e.g. { "kind": "HogQLQuery", "query": "SELECT event, count() FROM events GROUP BY event" })'
        )
    })
  )
  .output(
    z.object({
      columns: z.array(z.string()).optional().describe('Column names in the result set'),
      results: z.array(z.any()).optional().describe('Query result rows'),
      types: z.array(z.string()).optional().describe('Column data types'),
      hasMore: z.boolean().optional().describe('Whether there are more results available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.runQuery(ctx.input.query);

    let rowCount = result.results?.length ?? 0;

    return {
      output: {
        columns: result.columns,
        results: result.results,
        types: result.types,
        hasMore: result.hasMore ?? result.has_more
      },
      message: `Query returned **${rowCount}** row(s).`
    };
  })
  .build();
