import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

export let getStatistics = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve bandwidth, request, cache hit, and traffic statistics for your bunny.net account or a specific pull zone. Supports filtering by date range, region, and data type. Returns aggregated totals and time-series chart data.`,
  instructions: [
    'Omit pullZoneId to get account-wide statistics.',
    'Use dateFrom and dateTo to filter by date range (ISO 8601 format).',
    'Set hourly to true for hourly granularity instead of daily.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format (e.g. "2024-01-01T00:00:00Z")'),
      dateTo: z.string().optional().describe('End date in ISO 8601 format'),
      pullZoneId: z
        .number()
        .optional()
        .describe('Filter statistics by pull zone ID. Omit for account-wide stats.'),
      serverZoneId: z.number().optional().describe('Filter by server region ID'),
      hourly: z.boolean().optional().describe('Return hourly granularity instead of daily'),
      loadErrors: z
        .boolean()
        .optional()
        .describe('Include error response statistics (3xx, 4xx, 5xx)')
    })
  )
  .output(
    z.object({
      totalBandwidthUsed: z.number().optional().describe('Total bandwidth used in bytes'),
      totalOriginTraffic: z.number().optional().describe('Total origin traffic in bytes'),
      averageOriginResponseTime: z
        .number()
        .optional()
        .describe('Average origin response time in ms'),
      totalRequestsServed: z.number().optional().describe('Total requests served'),
      cacheHitRate: z.number().optional().describe('Cache hit rate as a decimal (0-1)'),
      bandwidthUsedChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('Bandwidth time-series data (timestamp → bytes)'),
      cacheHitRateChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('Cache hit rate time-series data'),
      requestsServedChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('Requests served time-series data'),
      originTrafficChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('Origin traffic time-series data'),
      error3xxChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('3xx error time-series data'),
      error4xxChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('4xx error time-series data'),
      error5xxChart: z
        .record(z.string(), z.number())
        .optional()
        .describe('5xx error time-series data'),
      geoTrafficDistribution: z
        .record(z.string(), z.number())
        .optional()
        .describe('Traffic distribution by geographic region')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.dateFrom) params.dateFrom = ctx.input.dateFrom;
    if (ctx.input.dateTo) params.dateTo = ctx.input.dateTo;
    if (ctx.input.pullZoneId !== undefined) params.pullZone = ctx.input.pullZoneId;
    if (ctx.input.serverZoneId !== undefined) params.serverZoneId = ctx.input.serverZoneId;
    if (ctx.input.hourly !== undefined) params.hourly = ctx.input.hourly;
    if (ctx.input.loadErrors !== undefined) params.loadErrors = ctx.input.loadErrors;

    let stats = await client.getStatistics(params);

    let formatBytes = (bytes: number): string => {
      if (!bytes || bytes === 0) return '0 B';
      let units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
    };

    let pullZoneInfo = ctx.input.pullZoneId ? ` for pull zone ${ctx.input.pullZoneId}` : '';
    let dateInfo = ctx.input.dateFrom ? ` from ${ctx.input.dateFrom}` : '';
    if (ctx.input.dateTo) dateInfo += ` to ${ctx.input.dateTo}`;

    return {
      output: {
        totalBandwidthUsed: stats.TotalBandwidthUsed,
        totalOriginTraffic: stats.TotalOriginTraffic,
        averageOriginResponseTime: stats.AverageOriginResponseTime,
        totalRequestsServed: stats.TotalRequestsServed,
        cacheHitRate: stats.CacheHitRate,
        bandwidthUsedChart: stats.BandwidthUsedChart,
        cacheHitRateChart: stats.CacheHitRateChart,
        requestsServedChart: stats.RequestsServedChart,
        originTrafficChart: stats.OriginTrafficChart,
        error3xxChart: stats.Error3xxChart,
        error4xxChart: stats.Error4xxChart,
        error5xxChart: stats.Error5xxChart,
        geoTrafficDistribution: stats.GeoTrafficDistribution
      },
      message: `Statistics${pullZoneInfo}${dateInfo}: **${stats.TotalRequestsServed?.toLocaleString()}** requests, **${formatBytes(stats.TotalBandwidthUsed)}** bandwidth, **${((stats.CacheHitRate || 0) * 100).toFixed(1)}%** cache hit rate.`
    };
  })
  .build();
