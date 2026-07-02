import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
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
        .enum(['1h', '2h', '6h', '12h', '1d', '2d', '7d'])
        .optional()
        .describe('Time bucket resolution')
    })
  )
  .output(
    z.object({
      trendBuckets: z.array(trendBucketSchema).describe('Trend data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let trends: any[];
    if (ctx.input.errorId) {
      trends = await client.getErrorTrends(projectId, ctx.input.errorId);
    } else {
      trends = await client.getProjectTrends(projectId, {
        resolution: ctx.input.resolution
      });
    }

    let trendBuckets = trends.map((t: any) => ({
      from: t.from,
      to: t.to,
      eventsCount: t.events_count ?? t.events
    }));

    return {
      output: { trendBuckets },
      message: `Retrieved **${trendBuckets.length}** trend data points.`
    };
  })
  .build();
