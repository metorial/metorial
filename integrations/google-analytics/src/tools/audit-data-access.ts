import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsAdminClient } from '../lib/client';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let auditDataAccess = SlateTool.create(spec, {
  name: 'Audit Data Access',
  key: 'audit_data_access',
  description: `Generate a data access report to audit who accessed your analytics data and when. Shows which users and service accounts made data requests against the GA4 property.

This helps with compliance and security monitoring by tracking API and UI data access patterns.`,
  instructions: propertyIdInstructions,
  tags: {
    readOnly: true
  }
})
  .scopes(googleAnalyticsActionScopes.auditDataAccess)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      startDate: z.string().describe('Start date in YYYY-MM-DD format.'),
      endDate: z.string().describe('End date in YYYY-MM-DD format.'),
      dimensions: z
        .array(
          z.enum([
            'accessDateHour',
            'accessedPropertyId',
            'accessedPropertyName',
            'accessorAppName',
            'accessorAppVersion',
            'accessMechanism',
            'accessorOs',
            'accessorOsVersion',
            'accessorUserType',
            'dataApiQuotaCategory',
            'epochTimeMicros',
            'mostRecentAccessEpochTimeMicros',
            'reportType',
            'revenueDataReturned',
            'costDataReturned',
            'userCountry',
            'userCountryId',
            'userEmail',
            'userIP'
          ])
        )
        .optional()
        .describe(
          'Dimensions for the access report. Common: accessedPropertyId, accessedPropertyName, accessorAppName.'
        ),
      metrics: z
        .array(z.enum(['accessCount', 'dataApiQuotaPropertyTokensConsumed']))
        .optional()
        .describe(
          'Metrics for the access report. Default: dataApiQuotaPropertyTokensConsumed. accessCount requires a Google Analytics 360 property.'
        ),
      limit: z.number().optional().describe('Maximum number of rows to return.'),
      offset: z.number().optional().describe('Row offset for pagination.')
    })
  )
  .output(
    z.object({
      dimensionHeaders: z
        .array(
          z.object({
            dimensionName: z.string().optional()
          })
        )
        .optional(),
      metricHeaders: z
        .array(
          z.object({
            metricName: z.string().optional()
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
    let client = new AnalyticsAdminClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    let requestDimensions = (
      ctx.input.dimensions || ['accessedPropertyId', 'accessedPropertyName', 'accessorAppName']
    ).map(d => ({ dimensionName: d }));
    let requestMetrics = (ctx.input.metrics || ['dataApiQuotaPropertyTokensConsumed']).map(
      m => ({ metricName: m })
    );

    let result = await client.runAccessReport(propertyId, {
      dateRanges: [{ startDate: ctx.input.startDate, endDate: ctx.input.endDate }],
      dimensions: requestDimensions,
      metrics: requestMetrics,
      limit: ctx.input.limit === undefined ? undefined : String(ctx.input.limit),
      offset: ctx.input.offset === undefined ? undefined : String(ctx.input.offset)
    });

    let rowCount = result.rowCount || (result.rows ? result.rows.length : 0);

    return {
      output: {
        dimensionHeaders: result.dimensionHeaders,
        metricHeaders: result.metricHeaders,
        rows: result.rows || [],
        rowCount: rowCount
      },
      message: `Data access report returned **${rowCount}** record(s) for ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
