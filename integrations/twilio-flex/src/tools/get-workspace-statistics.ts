import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { spec } from '../spec';

export let getWorkspaceStatisticsTool = SlateTool.create(spec, {
  name: 'Get Workspace Statistics',
  key: 'get_workspace_statistics',
  description: `Retrieve real-time and cumulative statistics for a TaskRouter workspace. Returns metrics like total tasks, tasks by status, average wait time, available workers, and activity-level breakdowns. Optionally fetch per-queue or per-worker statistics.`,
  instructions: [
    'Use minutesFilter to restrict cumulative stats to a specific time window.',
    'Provide taskQueueSid or workerSid to get statistics scoped to a specific queue or worker.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceSid: z.string().describe('Workspace SID'),
      scope: z
        .enum(['workspace', 'task_queue', 'worker'])
        .default('workspace')
        .describe('Statistics scope'),
      taskQueueSid: z
        .string()
        .optional()
        .describe('Task Queue SID (required when scope is task_queue)'),
      workerSid: z.string().optional().describe('Worker SID (required when scope is worker)'),
      minutesFilter: z
        .number()
        .optional()
        .describe('Filter cumulative statistics to the last N minutes'),
      startDate: z.string().optional().describe('Start date for statistics window (ISO 8601)'),
      endDate: z.string().optional().describe('End date for statistics window (ISO 8601)')
    })
  )
  .output(
    z.object({
      realtime: z.record(z.string(), z.any()).optional().describe('Real-time statistics'),
      cumulative: z.record(z.string(), z.any()).optional().describe('Cumulative statistics'),
      workspaceSid: z.string().optional().describe('Workspace SID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TaskRouterClient(ctx.auth.token, ctx.auth.accountSid);

    let params: Record<string, string | undefined> = {
      Minutes: ctx.input.minutesFilter?.toString(),
      StartDate: ctx.input.startDate,
      EndDate: ctx.input.endDate
    };

    let result: any;

    if (ctx.input.scope === 'task_queue') {
      if (!ctx.input.taskQueueSid)
        throw new Error('taskQueueSid is required for task_queue scope');
      result = await client.getTaskQueueStatistics(
        ctx.input.workspaceSid,
        ctx.input.taskQueueSid,
        params
      );
    } else if (ctx.input.scope === 'worker') {
      if (!ctx.input.workerSid) throw new Error('workerSid is required for worker scope');
      result = await client.getWorkerStatistics(
        ctx.input.workspaceSid,
        ctx.input.workerSid,
        params
      );
    } else {
      result = await client.getWorkspaceStatistics(ctx.input.workspaceSid, params);
    }

    return {
      output: {
        realtime: result.realtime,
        cumulative: result.cumulative,
        workspaceSid: result.workspace_sid || ctx.input.workspaceSid
      },
      message: `Retrieved **${ctx.input.scope}** statistics for workspace **${ctx.input.workspaceSid}**.`
    };
  })
  .build();
