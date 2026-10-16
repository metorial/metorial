import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, resource } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { bucketSchema } from './manage-bucket';
import { dashboardSchema } from './manage-dashboard';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the user associated with the current InfluxDB API token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('Provider user ID, when returned'),
      name: z.string().describe('User name'),
      status: z.string().optional().describe('Provider user status'),
      raw: z.any().optional().describe('Complete provider user')
    })
  )
  .handleInvocation(async ctx => {
    const user = resource(await createClient(ctx).getMe(), ['name']);
    return {
      output: {
        userId: optionalString(user.id),
        name: user.name,
        status: optionalString(user.status),
        raw: user
      },
      message: `Retrieved the current user **${user.name}**.`
    };
  })
  .build();

export const getBucket = SlateTool.create(spec, {
  name: 'Get Bucket',
  key: 'get_bucket',
  description:
    'Retrieve one bucket and its retention settings. Call list_buckets to discover bucket IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ bucketId: z.string().describe('Bucket ID from list_buckets') }))
  .output(bucketSchema)
  .handleInvocation(async ctx => {
    const bucket = resource(await createClient(ctx).getBucket(ctx.input.bucketId), [
      'id',
      'name'
    ]);
    return {
      output: {
        bucketId: bucket.id,
        name: bucket.name,
        description: optionalString(bucket.description),
        orgId: optionalString(bucket.orgID),
        retentionRules: Array.isArray(bucket.retentionRules)
          ? bucket.retentionRules
          : undefined,
        createdAt: optionalString(bucket.createdAt),
        updatedAt: optionalString(bucket.updatedAt),
        type: optionalString(bucket.type),
        raw: bucket
      },
      message: `Retrieved bucket **${bucket.name}**.`
    };
  })
  .build();

export const getDashboard = SlateTool.create(spec, {
  name: 'Get Dashboard',
  key: 'get_dashboard',
  description:
    'Retrieve one dashboard including its cells and labels. Call list_dashboards to discover dashboard IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ dashboardId: z.string().describe('Dashboard ID from list_dashboards') }))
  .output(dashboardSchema)
  .handleInvocation(async ctx => {
    const dashboard = resource(await createClient(ctx).getDashboard(ctx.input.dashboardId), [
      'id',
      'name'
    ]);
    return {
      output: {
        dashboardId: dashboard.id,
        name: dashboard.name,
        description: optionalString(dashboard.description),
        orgId: optionalString(dashboard.orgID),
        createdAt: optionalString(dashboard.meta?.createdAt),
        updatedAt: optionalString(dashboard.meta?.updatedAt),
        cells: Array.isArray(dashboard.cells) ? dashboard.cells : undefined,
        labels: Array.isArray(dashboard.labels) ? dashboard.labels : undefined,
        raw: dashboard
      },
      message: `Retrieved dashboard **${dashboard.name}**.`
    };
  })
  .build();

export const getTaskRunLogs = SlateTool.create(spec, {
  name: 'Get Task Run Logs',
  key: 'get_task_run_logs',
  description:
    'Retrieve task-run log events to diagnose a failed or completed run. Use get_task_runs to discover run IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID'),
      runId: z.string().describe('Run ID from get_task_runs')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          time: z.string().optional().describe('Provider event timestamp'),
          message: z.string().optional().describe('Provider log message'),
          raw: z.any().optional().describe('Complete provider event')
        })
      ),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).getTaskRunLogs(ctx.input.taskId, ctx.input.runId);
    const events = requireArray(result, 'events').map(value => {
      const event = resource(value, []);
      return {
        time: optionalString(event.time),
        message: optionalString(event.message),
        raw: event
      };
    });
    return {
      output: { events, raw: result },
      message: `Retrieved **${events.length}** task-run log event(s).`
    };
  })
  .build();
