import { SlateTool } from 'slates';
import { z } from 'zod';
import { isDatadogResponseTooLarge, MAX_METRICS_RESPONSE_BYTES } from '../lib/client';
import { createClient, takeWithinOutputBudget } from '../lib/helpers';
import { spec } from '../spec';

export let queryMetrics = SlateTool.create(spec, {
  name: 'Query Metrics',
  key: 'query_metrics',
  description: `Query timeseries metric data from Datadog. Retrieve metric values over a specified time range using Datadog's query language.
Use metric queries like \`avg:system.cpu.user{host:myhost}\` or \`sum:my.custom.metric{env:production}.as_count()\`.`,
  instructions: [
    'The query uses Datadog metric query syntax, e.g. "avg:system.cpu.user{*}" or "sum:requests.count{service:web}.as_count()".',
    'Time range is specified as Unix timestamps in seconds.',
    'Use "from" as the start time and "to" as the end time.',
    'Results too large to return inline are marked truncated and the complete result is provided as a downloadable JSON file in Datadog\'s raw query format. To get every series inline instead, narrow the scope, reduce the "by" grouping, or shorten the time range.'
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
      truncated: z
        .boolean()
        .optional()
        .describe(
          'True when some or all series were left out because the result was too large; the complete result is provided as a downloadable JSON file'
        ),
      totalSeries: z
        .number()
        .optional()
        .describe(
          'Total number of series the query returned before truncation, when the result was small enough to count'
        ),
      fromDate: z.number().optional().describe('Query start timestamp'),
      toDate: z.number().optional().describe('Query end timestamp'),
      query: z.string().optional().describe('The query that was executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let params = {
      from: ctx.input.from,
      to: ctx.input.to,
      query: ctx.input.query
    };

    let attachFullResult = () =>
      ctx.addAttachment({
        type: 'url',
        mimeType: 'application/json',
        ...client.getMetricsQueryDownload(params)
      });

    let result: any;
    try {
      result = await client.queryMetrics(params);
    } catch (error) {
      if (!isDatadogResponseTooLarge(error)) throw error;

      await attachFullResult();

      return {
        output: {
          series: [],
          truncated: true,
          query: ctx.input.query
        },
        message: `Queried metrics: **${ctx.input.query}** — the result is larger than ${
          MAX_METRICS_RESPONSE_BYTES / 1024 / 1024
        } MiB, too large to return inline. The complete result is provided as a downloadable JSON file. To get series inline, group by fewer or lower-cardinality tags, narrow the scope, or shorten the time range.`
      };
    }

    let allSeries: any[] = (result.series || []).map((s: any) => ({
      metric: s.metric,
      displayName: s.display_name,
      pointlist: s.pointlist,
      scope: s.scope,
      unit: s.unit,
      tagSet: s.tag_set
    }));
    let { items: series, truncated } = takeWithinOutputBudget(allSeries);

    if (truncated) await attachFullResult();

    return {
      output: {
        status: result.status,
        series,
        truncated: truncated || undefined,
        totalSeries: truncated ? allSeries.length : undefined,
        fromDate: result.from_date,
        toDate: result.to_date,
        query: result.query
      },
      message: `Queried metrics: **${ctx.input.query}** — returned ${series.length} series${
        truncated
          ? ` of ${allSeries.length}. The complete result is provided as a downloadable JSON file; to get every series inline, narrow the query or time range.`
          : ''
      }`
    };
  })
  .build();
