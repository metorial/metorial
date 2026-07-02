import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let queryMetrics = SlateTool.create(spec, {
  name: 'Query Metrics',
  key: 'query_metrics',
  description: `Query timeseries metric data from Datadog. Retrieve metric values over a specified time range using Datadog's query language.
Use metric queries like \`avg:system.cpu.user{host:myhost}\` or \`sum:my.custom.metric{env:production}.as_count()\`.`,
  instructions: [
    'The query uses Datadog metric query syntax, e.g. "avg:system.cpu.user{*}" or "sum:requests.count{service:web}.as_count()".',
    'Time range is specified as Unix timestamps in seconds.',
    'Use "from" as the start time and "to" as the end time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Datadog metric query string, e.g. "avg:system.cpu.user{host:myhost}"'),
      from: z
        .number()
        .describe('Start of the query time range as a Unix timestamp in seconds'),
      to: z.number().describe('End of the query time range as a Unix timestamp in seconds')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Query status'),
      series: z
        .array(
          z.object({
            metric: z.string().optional(),
            displayName: z.string().optional(),
            pointlist: z.array(z.array(z.number())).optional(),
            scope: z.string().optional(),
            unit: z.any().optional(),
            tagSet: z.array(z.string()).optional()
          })
        )
        .describe('Timeseries data returned by the query'),
      fromDate: z.number().optional().describe('Query start timestamp'),
      toDate: z.number().optional().describe('Query end timestamp'),
      query: z.string().optional().describe('The query that was executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.queryMetrics({
      from: ctx.input.from,
      to: ctx.input.to,
      query: ctx.input.query
    });

    let series = (result.series || []).map((s: any) => ({
      metric: s.metric,
      displayName: s.display_name,
      pointlist: s.pointlist,
      scope: s.scope,
      unit: s.unit,
      tagSet: s.tag_set
    }));

    return {
      output: {
        status: result.status,
        series,
        fromDate: result.from_date,
        toDate: result.to_date,
        query: result.query
      },
      message: `Queried metrics: **${ctx.input.query}** — returned ${series.length} series`
    };
  })
  .build();
