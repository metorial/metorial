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

export let runRealtimeReport = SlateTool.create(spec, {
  name: 'Run Realtime Report',
  key: 'run_realtime_report',
  description: `Query real-time analytics data showing current activity on a GA4 property. Shows data from the last 30 minutes.

Common real-time dimensions: \`unifiedScreenName\`, \`city\`, \`country\`, \`deviceCategory\`, \`platform\`, \`appVersion\`.
Common real-time metrics: \`activeUsers\`, \`screenPageViews\`, \`eventCount\`, \`conversions\`.`,
  instructions: propertyIdInstructions,
  tags: {
    readOnly: true
  }
})
  .scopes(googleAnalyticsActionScopes.runRealtimeReport)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      dimensions: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Realtime dimension name (e.g., "unifiedScreenName", "city", "country").'
              )
          })
        )
        .optional()
        .describe('Dimensions to group real-time results by.'),
      metrics: z
        .array(
          z.object({
            name: z
              .string()
              .describe('Realtime metric name (e.g., "activeUsers", "screenPageViews").')
          })
        )
        .min(1)
        .describe('Metrics to include in the real-time report.'),
      dimensionFilter: z
        .any()
        .optional()
        .describe('Dimension filter expression to narrow results.'),
      metricFilter: z.any().optional().describe('Metric filter expression to narrow results.'),
      limit: z.number().optional().describe('Maximum number of rows to return.')
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
      rowCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsDataClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    let result = await client.runRealtimeReport(propertyId, {
      dimensions: ctx.input.dimensions,
      metrics: ctx.input.metrics,
      dimensionFilter: ctx.input.dimensionFilter,
      metricFilter: ctx.input.metricFilter,
      limit: ctx.input.limit
    });

    let rowCount = result.rowCount || (result.rows ? result.rows.length : 0);

    return {
      output: {
        dimensionHeaders: result.dimensionHeaders,
        metricHeaders: result.metricHeaders,
        rows: result.rows || [],
        rowCount: rowCount
      },
      message: `Real-time report returned **${rowCount}** rows showing current activity on the property.`
    };
  })
  .build();
