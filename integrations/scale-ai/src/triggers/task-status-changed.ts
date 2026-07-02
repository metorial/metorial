import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskStatusChanged = SlateTrigger.create(spec, {
  name: 'Task Status Changed',
  key: 'task_status_changed',
  description:
    '[Polling fallback] Polls for tasks that have been updated since the last check. Detects task completions, cancellations, and errors across a project or batch.',
  instructions: [
    'Specify a project name to monitor. Optionally filter by batch.',
    'Uses polling to check for updated tasks at a regular interval.'
  ]
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      status: z.string().describe('Current task status'),
      taskType: z.string().optional().describe('Type of the task'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
      rawTask: z.any().describe('Full raw task object')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('ID of the updated task'),
        status: z
          .string()
          .describe('Current task status (pending, completed, canceled, error)'),
        taskType: z.string().optional().describe('Type of the task'),
        projectName: z.string().optional().describe('Project the task belongs to'),
        batchName: z.string().optional().describe('Batch the task belongs to'),
        response: z.any().optional().describe('Task response/annotations when completed'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
        completedAt: z.string().optional().describe('ISO 8601 completion timestamp'),
        updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = ctx.state as { lastPollTime?: string } | null;
      let lastPollTime = state?.lastPollTime;

      let params: Record<string, any> = {
        limit: 100
      };

      if (lastPollTime) {
        params.updatedAfter = lastPollTime;
      }

      let result = await client.listTasks(params);
      let tasks = result.docs ?? [];

      let now = new Date().toISOString();

      return {
        inputs: tasks.map((t: any) => ({
          taskId: t.task_id,
          status: t.status,
          taskType: t.type,
          updatedAt: t.updated_at,
          rawTask: t
        })),
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.rawTask ?? {};

      return {
        type: `task.${ctx.input.status}`,
        id: `${ctx.input.taskId}-${ctx.input.updatedAt ?? ctx.input.status}`,
        output: {
          taskId: ctx.input.taskId,
          status: ctx.input.status,
          taskType: ctx.input.taskType,
          projectName: task.project,
          batchName: task.batch,
          response: task.response,
          createdAt: task.created_at,
          completedAt: task.completed_at,
          updatedAt: task.updated_at ?? ctx.input.updatedAt,
          ...task
        }
      };
    }
  })
  .build();
