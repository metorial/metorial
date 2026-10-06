import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import type { Trend } from '../lib/types';
import { spec } from '../spec';

let trendBucketSchema = z.object({
  from: z.string().optional().describe('Start of the time bucket (ISO 8601)'),
  to: z.string().optional().describe('End of the time bucket (ISO 8601)'),
  eventsCount: z.number().optional().describe('Number of events in this bucket')
});

export let getErrorTrends = SlateTool.create(spec, {
  name: 'Get Error Trends',
  key: 'get_error_trends',
  description: `View error trend data over time for a project or specific error. Returns time-bucketed event counts useful for identifying spikes, regressions, or improvements in error rates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      errorId: z
        .string()
        .optional()
        .describe('Error ID for error-specific trends (omit for project-level trends)'),
      resolution: z
        .enum(['1h', '2h', '6h', '12h', '1d', '2d', '7d', '1m', '5m', '30m'])
        .optional()
        .describe(
          'Supported resolutions: 1m, 5m, 30m, 2h, 12h. Other legacy enum values are rejected with guidance.'
        ),
      bucketsCount: z
        .number()
        .optional()
        .describe('Number of time buckets (1 to 50; default 30 when resolution is omitted)'),
      since: z
        .string()
        .optional()
        .describe('UTC ISO 8601 start time or relative time such as 7d'),
      before: z
        .string()
        .optional()
        .describe('UTC ISO 8601 end time or relative time such as 1h')
    })
  )
  .output(
    z.object({
      trendBuckets: z.array(trendBucketSchema).describe('Trend data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    if (
      ctx.input.resolution &&
      !['1m', '5m', '30m', '2h', '12h'].includes(ctx.input.resolution)
    )
      throw createApiServiceError(
        'This legacy resolution is unsupported by the current Bugsnag API. Use 1m, 5m, 30m, 2h, or 12h, or omit resolution and supply bucketsCount.',
        { reason: 'unsupported_parameter' }
      );
    if (
      ctx.input.bucketsCount !== undefined &&
      (!Number.isInteger(ctx.input.bucketsCount) ||
        ctx.input.bucketsCount < 1 ||
        ctx.input.bucketsCount > 50)
    )
      throw createApiServiceError('Bucket count must be an integer from 1 to 50.');
    const trends: Trend[] = await client.getTrends(projectId, ctx.input.errorId, {
      resolution: ctx.input.resolution,
      bucketsCount: ctx.input.bucketsCount,
      filters: {
        ...(ctx.input.since
          ? { 'event.since': [{ type: 'eq', value: ctx.input.since }] }
          : {}),
        ...(ctx.input.before
          ? { 'event.before': [{ type: 'eq', value: ctx.input.before }] }
          : {})
      }
    });

    let trendBuckets = trends.map(t => ({
      from: t.from ?? undefined,
      to: t.to ?? undefined,
      eventsCount: t.events_count ?? undefined
    }));

    return {
      output: { trendBuckets },
      message: `Retrieved **${trendBuckets.length}** trend data points.`
    };
  })
  .build();
