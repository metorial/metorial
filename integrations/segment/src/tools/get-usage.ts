import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { segmentServiceError } from '../lib/errors';
import { spec } from '../spec';

let defaultUsagePeriod = () => {
  let now = new Date();
  let month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}-01`;
};

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage Metrics',
  key: 'get_usage',
  description: `Query current Segment monitoring data: daily API call usage, daily monthly tracked users (MTU), destination delivery metrics, and workspace event volume. Useful for monitoring consumption and identifying sources of high event volume.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metricType: z
        .enum(['api_calls', 'mtu', 'delivery', 'events_volume'])
        .describe('Type of usage metric to query'),
      usageScope: z
        .enum(['workspace', 'source'])
        .optional()
        .describe('For api_calls and mtu, choose workspace totals or per-source totals'),
      period: z
        .string()
        .optional()
        .describe(
          'Usage month start in ISO date format (YYYY-MM-01) for api_calls and mtu. Defaults to the current UTC month.'
        ),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID (required for delivery metrics)'),
      sourceId: z.string().optional().describe('Source ID filter for delivery metrics'),
      sourceIds: z
        .array(z.string())
        .optional()
        .describe('Source IDs to include for events_volume'),
      eventNames: z
        .array(z.string())
        .optional()
        .describe('Event names to include for events_volume'),
      eventTypes: z
        .array(z.string())
        .optional()
        .describe('Event types to include for events_volume'),
      appVersions: z
        .array(z.string())
        .optional()
        .describe('App versions to include for events_volume'),
      groupBy: z
        .array(z.enum(['eventName', 'eventType', 'source']))
        .optional()
        .describe('Dimensions to group events_volume results by'),
      startTime: z
        .string()
        .optional()
        .describe('Start time ISO 8601 (required for delivery and events_volume metrics)'),
      endTime: z
        .string()
        .optional()
        .describe('End time ISO 8601 (required for delivery and events_volume metrics)'),
      granularity: z
        .string()
        .optional()
        .describe(
          'Granularity for delivery or events_volume metrics. Delivery accepts DAY/HOUR/MINUTE; events_volume accepts DAY/HOUR/MINUTE.'
        ),
      count: z.number().optional().describe('Number of results per page'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      usage: z.any().describe('Usage data (structure varies by metric type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.metricType === 'api_calls') {
      let period =
        ctx.input.period === 'current'
          ? defaultUsagePeriod()
          : (ctx.input.period ?? defaultUsagePeriod());
      let result =
        ctx.input.usageScope === 'source'
          ? await client.getDailyPerSourceApiCallsUsage({
              period,
              count: ctx.input.count,
              cursor: ctx.input.cursor
            })
          : await client.getDailyWorkspaceApiCallsUsage({
              period,
              count: ctx.input.count,
              cursor: ctx.input.cursor
            });
      return {
        output: { usage: result },
        message: `Retrieved **${ctx.input.usageScope ?? 'workspace'}** API call usage for period **${period}**`
      };
    }

    if (ctx.input.metricType === 'mtu') {
      let period =
        ctx.input.period === 'current'
          ? defaultUsagePeriod()
          : (ctx.input.period ?? defaultUsagePeriod());
      let result =
        ctx.input.usageScope === 'source'
          ? await client.getDailyPerSourceMtuUsage({
              period,
              count: ctx.input.count,
              cursor: ctx.input.cursor
            })
          : await client.getDailyWorkspaceMtuUsage({
              period,
              count: ctx.input.count,
              cursor: ctx.input.cursor
            });
      return {
        output: { usage: result },
        message: `Retrieved **${ctx.input.usageScope ?? 'workspace'}** MTU usage for period **${period}**`
      };
    }

    if (ctx.input.metricType === 'delivery') {
      if (!ctx.input.destinationId) {
        throw segmentServiceError('destinationId is required for delivery metrics');
      }
      let result = await client.listDeliveryMetrics(ctx.input.destinationId, {
        sourceId: ctx.input.sourceId,
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime,
        granularity: ctx.input.granularity
      });
      return {
        output: { usage: result },
        message: `Retrieved delivery metrics for destination \`${ctx.input.destinationId}\``
      };
    }

    if (ctx.input.metricType === 'events_volume') {
      if (!ctx.input.startTime || !ctx.input.endTime || !ctx.input.granularity) {
        throw segmentServiceError(
          'startTime, endTime, and granularity are required for events_volume metrics'
        );
      }

      let result = await client.getEventsVolume({
        granularity: ctx.input.granularity,
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime,
        groupBy: ctx.input.groupBy,
        sourceId: ctx.input.sourceIds,
        eventName: ctx.input.eventNames,
        eventType: ctx.input.eventTypes,
        appVersion: ctx.input.appVersions,
        count: ctx.input.count,
        cursor: ctx.input.cursor
      });

      return {
        output: { usage: result },
        message: `Retrieved event volume from **${ctx.input.startTime}** to **${ctx.input.endTime}**`
      };
    }

    throw segmentServiceError(`Unknown metric type: ${ctx.input.metricType}`);
  })
  .build();
