import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Analytics',
  key: 'get_analytics',
  description: `Retrieve analytics data for QR codes, beacons, NFC tags, or geofences. Supports three report types:
- **overview**: Aggregate counts (notifications, impressions, conversions, unique visitors) for a product type.
- **performance**: Time-series data with configurable intervals for tracking trends.
- **impressions**: Individual impression records with timestamps and user agent details.

Requires an organization ID and a time range specified as epoch milliseconds.`,
  instructions: [
    'Time range values (startDate, endDate) must be epoch timestamps in milliseconds.',
    'Product type must be one of: "qr", "beacon", "nfc", "geofence".',
    'The organizationId from config is used if not explicitly provided.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['overview', 'performance', 'impressions'])
        .describe('Type of analytics report to retrieve'),
      productType: z
        .enum(['qr', 'beacon', 'nfc', 'geofence'])
        .describe('Product type to get analytics for'),
      startDate: z.string().describe('Start of time range as epoch milliseconds'),
      endDate: z.string().describe('End of time range as epoch milliseconds'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID. Falls back to the configured organizationId.'),
      interval: z
        .string()
        .optional()
        .describe('Time interval for performance reports (e.g. "day", "week", "month")'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for performance reports (e.g. "America/New_York")'),
      productId: z.number().optional().describe('Filter to a specific product by ID'),
      placeId: z.number().optional().describe('Filter impressions by place ID'),
      limit: z.number().optional().describe('Maximum number of impression records to return'),
      offset: z.number().optional().describe('Pagination offset for impression records')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('Type of report returned'),
      productType: z.string().describe('Product type queried'),
      overview: z
        .object({
          productCount: z.number().optional().describe('Total products'),
          notificationCount: z.number().optional().describe('Total notifications'),
          impressionCount: z.number().optional().describe('Total impressions'),
          conversionPercentage: z.number().optional().describe('Conversion rate'),
          uniqueVisitors: z.number().optional().describe('Unique visitors')
        })
        .optional()
        .describe('Overview analytics (when reportType is "overview")'),
      performanceData: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Time-series performance data (when reportType is "performance")'),
      impressionsData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Impression records (when reportType is "impressions")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let orgId = ctx.input.organizationId ?? ctx.config.organizationId;
    if (!orgId) {
      throw new Error(
        'Organization ID is required for analytics. Set it in config or provide it as input.'
      );
    }

    if (ctx.input.reportType === 'overview') {
      let result = await client.getAnalyticsOverview({
        organizationId: orgId,
        productType: ctx.input.productType,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      });

      return {
        output: {
          reportType: 'overview',
          productType: ctx.input.productType,
          overview: {
            productCount: result.product_count,
            notificationCount: result.notification_count,
            impressionCount: result.impression_count,
            conversionPercentage: result.conversion_percentage,
            uniqueVisitors: result.unique_visitors
          }
        },
        message: `**${ctx.input.productType.toUpperCase()} Overview**: ${result.impression_count ?? 0} impressions, ${result.unique_visitors ?? 0} unique visitors, ${result.conversion_percentage ?? 0}% conversion.`
      };
    }

    if (ctx.input.reportType === 'performance') {
      let result = await client.getAnalyticsPerformance({
        organizationId: orgId,
        productType: ctx.input.productType,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        interval: ctx.input.interval,
        timezone: ctx.input.timezone,
        productId: ctx.input.productId
      });

      return {
        output: {
          reportType: 'performance',
          productType: ctx.input.productType,
          performanceData: result.data
        },
        message: `Retrieved **${ctx.input.productType.toUpperCase()} performance** data with ${result.data?.length ?? 0} data point(s).`
      };
    }

    // impressions
    let result = await client.getAnalyticsImpressions({
      organizationId: orgId,
      productType: ctx.input.productType,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      productId: ctx.input.productId,
      placeId: ctx.input.placeId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        reportType: 'impressions',
        productType: ctx.input.productType,
        impressionsData: result
      },
      message: `Retrieved **${ctx.input.productType.toUpperCase()} impressions** data.`
    };
  })
  .build();
