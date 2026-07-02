import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsDataClient } from '../lib/client';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

let dimensionFilterSchema: z.ZodType<any> = z
  .object({
    filter: z
      .object({
        fieldName: z
          .string()
          .describe('The dimension name to filter on (e.g., "city", "country", "pagePath").'),
        stringFilter: z
          .object({
            matchType: z
              .enum([
                'EXACT',
                'BEGINS_WITH',
                'ENDS_WITH',
                'CONTAINS',
                'FULL_REGEXP',
                'PARTIAL_REGEXP'
              ])
              .optional(),
            value: z.string(),
            caseSensitive: z.boolean().optional()
          })
          .optional(),
        inListFilter: z
          .object({
            values: z.array(z.string()),
            caseSensitive: z.boolean().optional()
          })
          .optional()
      })
      .optional(),
    andGroup: z
      .object({
        expressions: z.array(z.lazy(() => dimensionFilterSchema))
      })
      .optional(),
    orGroup: z
      .object({
        expressions: z.array(z.lazy(() => dimensionFilterSchema))
      })
      .optional(),
    notExpression: z.lazy(() => dimensionFilterSchema).optional()
  })
  .describe(
    'Dimension filter expression. Use filter for simple filters, or andGroup/orGroup/notExpression for compound filters.'
  );

let orderBySchema = z
  .object({
    dimension: z
      .object({
        dimensionName: z.string(),
        orderType: z
          .enum(['ALPHANUMERIC', 'CASE_INSENSITIVE_ALPHANUMERIC', 'NUMERIC'])
          .optional()
      })
      .optional(),
    metric: z
      .object({
        metricName: z.string()
      })
      .optional(),
    desc: z.boolean().optional().describe('If true, sorts in descending order.')
  })
  .describe('Order by clause. Specify either dimension or metric, not both.');

export let runReport = SlateTool.create(spec, {
  name: 'Run Report',
  key: 'run_report',
  description: `Query an analytics report from a GA4 property with configurable dimensions, metrics, date ranges, filters, and sorting. Supports up to 4 simultaneous date ranges and provides unsampled data.

Common dimensions: \`date\`, \`city\`, \`country\`, \`pagePath\`, \`pageTitle\`, \`sessionSource\`, \`sessionMedium\`, \`deviceCategory\`, \`browser\`, \`operatingSystem\`.
Common metrics: \`activeUsers\`, \`sessions\`, \`screenPageViews\`, \`conversions\`, \`totalRevenue\`, \`bounceRate\`, \`averageSessionDuration\`, \`newUsers\`.`,
  instructions: [
    ...propertyIdInstructions,
    'Use the "get_metadata" tool first to explore available dimensions and metrics if unsure what to query.',
    'Date format for startDate/endDate is "YYYY-MM-DD". You can also use "today", "yesterday", or "NdaysAgo" (e.g., "30daysAgo").'
  ],
  constraints: [
    'Maximum of 4 date ranges per request.',
    'Maximum of 9 dimensions per request.',
    'Maximum of 10 metrics per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleAnalyticsActionScopes.runReport)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      dateRanges: z
        .array(
          z.object({
            startDate: z
              .string()
              .describe(
                'Start date in YYYY-MM-DD format, or "today", "yesterday", "NdaysAgo".'
              ),
            endDate: z
              .string()
              .describe('End date in YYYY-MM-DD format, or "today", "yesterday", "NdaysAgo".')
          })
        )
        .min(1)
        .max(4)
        .describe('Date ranges to query. At least 1 required, up to 4 allowed.'),
      dimensions: z
        .array(
          z.object({
            name: z.string().describe('Dimension name (e.g., "date", "city", "pagePath").')
          })
        )
        .optional()
        .describe('Dimensions to group results by.'),
      metrics: z
        .array(
          z.object({
            name: z
              .string()
              .describe('Metric name (e.g., "activeUsers", "sessions", "screenPageViews").')
          })
        )
        .min(1)
        .describe('Metrics to include in the report.'),
      dimensionFilter: dimensionFilterSchema.optional(),
      orderBys: z
        .array(orderBySchema)
        .optional()
        .describe('Order by clauses for sorting results.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of rows to return (default: 10000).'),
      offset: z.number().optional().describe('Row offset for pagination.'),
      keepEmptyRows: z
        .boolean()
        .optional()
        .describe('If true, includes rows with all zero metric values.')
    })
  )
  .output(
    z.object({
      dimensionHeaders: z
        .array(
          z.object({
            name: z.string()
          })
        )
        .optional(),
      metricHeaders: z
        .array(
          z.object({
            name: z.string(),
            type: z.string()
          })
        )
        .optional(),
      rows: z
        .array(
          z.object({
            dimensionValues: z.array(z.object({ value: z.string() })).optional(),
            metricValues: z.array(z.object({ value: z.string() })).optional()
          })
        )
        .optional(),
      rowCount: z.number().optional(),
      metadata: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsDataClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    let result = await client.runReport(propertyId, {
      dateRanges: ctx.input.dateRanges,
      dimensions: ctx.input.dimensions,
      metrics: ctx.input.metrics,
      dimensionFilter: ctx.input.dimensionFilter,
      orderBys: ctx.input.orderBys,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      keepEmptyRows: ctx.input.keepEmptyRows
    });

    let rowCount = result.rowCount || (result.rows ? result.rows.length : 0);

    return {
      output: {
        dimensionHeaders: result.dimensionHeaders,
        metricHeaders: result.metricHeaders,
        rows: result.rows || [],
        rowCount: rowCount,
        metadata: result.metadata
      },
      message: `Report returned **${rowCount}** rows with ${result.metricHeaders?.length || 0} metrics and ${result.dimensionHeaders?.length || 0} dimensions.`
    };
  })
  .build();
