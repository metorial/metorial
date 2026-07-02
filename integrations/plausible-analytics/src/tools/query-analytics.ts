import { SlateTool } from 'slates';
import { z } from 'zod';
import { StatsClient } from '../lib/client';
import { spec } from '../spec';

let normalizeDateRange = (
  value:
    | 'day'
    | '24h'
    | '7d'
    | '28d'
    | '30d'
    | '91d'
    | 'month'
    | '6mo'
    | '12mo'
    | 'year'
    | 'all'
    | [string?, string?, ...unknown[]]
): string | string[] => {
  if (typeof value === 'string') return value;
  let [start, end] = value;
  if (typeof start === 'string' && typeof end === 'string') return [start, end];
  return [];
};

let normalizeOrderBy = (
  value?: [string?, ('asc' | 'desc')?, ...unknown[]][]
): [string, string][] | undefined => {
  if (!value) return undefined;
  let normalized = value
    .map(([field, direction]) => {
      if (typeof field !== 'string' || (direction !== 'asc' && direction !== 'desc'))
        return null;
      return [field, direction] as [string, string];
    })
    .filter((item): item is [string, string] => item !== null);
  return normalized.length > 0 ? normalized : undefined;
};

export let queryAnalytics = SlateTool.create(spec, {
  name: 'Query Analytics',
  key: 'query_analytics',
  description: `Query website analytics data from Plausible. Supports metrics like visitors, pageviews, bounce rate, visit duration, and revenue. Data can be broken down by dimensions such as page, traffic source, country, device, browser, OS, and UTM parameters. Supports configurable date ranges and time-series output.`,
  instructions: [
    'Use dimension prefixes: "event:" for event dimensions (e.g., event:page, event:goal), "visit:" for visit dimensions (e.g., visit:source, visit:country), "time:" for time dimensions (e.g., time:day, time:month).',
    'Filters use the format: [operator, dimension, [values]]. Operators include "is", "is_not", "contains", "contains_not", "matches", "matches_not".',
    'Custom properties can be queried using the dimension "event:props:property_name".'
  ],
  constraints: [
    'Rate limited to 600 requests per hour.',
    'Some dimension/metric combinations may not work with imported data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z
        .string()
        .describe('Domain of your site as registered in Plausible (e.g., "example.com")'),
      metrics: z
        .array(
          z.enum([
            'visitors',
            'visits',
            'pageviews',
            'views_per_visit',
            'bounce_rate',
            'visit_duration',
            'events',
            'scroll_depth',
            'percentage',
            'conversion_rate',
            'group_conversion_rate',
            'average_revenue',
            'total_revenue',
            'time_on_page'
          ])
        )
        .describe('Metrics to retrieve'),
      dateRange: z
        .union([
          z.enum([
            'day',
            '24h',
            '7d',
            '28d',
            '30d',
            '91d',
            'month',
            '6mo',
            '12mo',
            'year',
            'all'
          ]),
          z.tuple([z.string(), z.string()])
        ])
        .describe(
          'Date range for the query. Use a preset string or a tuple of [startDate, endDate] in YYYY-MM-DD format.'
        ),
      dimensions: z
        .array(z.string())
        .optional()
        .describe(
          'Dimensions to break down results by (e.g., "event:page", "visit:source", "visit:country", "time:day")'
        ),
      filters: z
        .array(z.any())
        .optional()
        .describe(
          'Filters to apply. Format: [operator, dimension, [values]]. Example: [["is", "visit:country", ["US", "GB"]]]'
        ),
      orderBy: z
        .array(z.tuple([z.string(), z.enum(['asc', 'desc'])]))
        .optional()
        .describe('Order results by metric or dimension. Format: [[field, "asc"|"desc"]]'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 10000)'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
      includeImports: z
        .boolean()
        .optional()
        .describe('Include imported data (e.g., from Google Analytics)'),
      includeTimeLabels: z
        .boolean()
        .optional()
        .describe('Include time labels in response (requires a time dimension)'),
      includeTotalRows: z
        .boolean()
        .optional()
        .describe('Include total row count for pagination')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            metrics: z
              .array(z.any())
              .describe('Metric values in the order they were requested'),
            dimensions: z
              .array(z.any())
              .describe('Dimension values in the order they were requested')
          })
        )
        .describe('Query results'),
      meta: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata including imports info, time labels, and total rows'),
      query: z.record(z.string(), z.any()).optional().describe('The executed query parameters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StatsClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.query({
      siteId: ctx.input.siteId,
      metrics: ctx.input.metrics,
      dateRange: normalizeDateRange(ctx.input.dateRange),
      dimensions: ctx.input.dimensions,
      filters: ctx.input.filters,
      orderBy: normalizeOrderBy(ctx.input.orderBy),
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      includeImports: ctx.input.includeImports,
      includeTimeLabels: ctx.input.includeTimeLabels,
      includeTotalRows: ctx.input.includeTotalRows
    });

    let rowCount = result.results?.length ?? 0;
    return {
      output: {
        results: result.results ?? [],
        meta: result.meta,
        query: result.query
      },
      message: `Retrieved ${rowCount} result(s) for metrics **${ctx.input.metrics.join(', ')}** on site **${ctx.input.siteId}** for date range **${typeof ctx.input.dateRange === 'string' ? ctx.input.dateRange : ctx.input.dateRange.join(' to ')}**.`
    };
  })
  .build();
