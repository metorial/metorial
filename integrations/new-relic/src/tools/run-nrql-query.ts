import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

export let runNrqlQuery = SlateTool.create(spec, {
  name: 'Run NRQL Query',
  key: 'run_nrql_query',
  description: `Execute an NRQL (New Relic Query Language) query against your telemetry data.
Use this to query metrics, events, logs, and traces stored in New Relic.
Supports filtering, aggregation, faceting, and time-series analysis with SQL-like syntax.`,
  instructions: [
    'NRQL queries follow SQL-like syntax, e.g. `SELECT count(*) FROM Transaction SINCE 1 hour ago`.',
    'Use `TIMESERIES` for time-bucketed results, `FACET` for grouping, and `SINCE`/`UNTIL` for time ranges.'
  ],
  constraints: ['Query timeout defaults to 30 seconds. Maximum timeout is 120 seconds.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nrql: z
        .string()
        .describe(
          'NRQL query string to execute, e.g. "SELECT count(*) FROM Transaction SINCE 1 hour ago"'
        ),
      timeout: z
        .number()
        .optional()
        .describe('Query timeout in seconds (default: 30, max: 120)')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Array of query result rows'),
      timeWindow: z
        .object({
          begin: z.string().optional().describe('Start of the query time window'),
          end: z.string().optional().describe('End of the query time window')
        })
        .optional()
        .describe('Time window of the query'),
      facets: z.array(z.string()).optional().describe('Facet columns used in the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    ctx.progress('Executing NRQL query...');
    let result = await client.runNrql(ctx.input.nrql, ctx.input.timeout);

    let results = result?.results || [];
    let metadata = result?.metadata;

    return {
      output: {
        results,
        timeWindow: metadata?.timeWindow
          ? {
              begin: metadata.timeWindow.begin?.toString(),
              end: metadata.timeWindow.end?.toString()
            }
          : undefined,
        facets: Array.isArray(metadata?.facets) ? metadata.facets : undefined
      },
      message: `NRQL query executed successfully. Returned **${results.length}** result(s).`
    };
  })
  .build();
