import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let taskRunsTrigger = SlateTrigger.create(spec, {
  name: 'Task Run Updates',
  key: 'task_run_updates',
  description:
    'Polls for new task runs and their completion status. Detects when scheduled Flux tasks complete, fail, or are canceled.'
})
  .input(
    z.object({
      runId: z.string().describe('Unique run ID'),
      taskId: z.string().describe('Task ID'),
      taskName: z.string().describe('Task name'),
      status: z.string().describe('Run status (e.g. success, failed, canceled)'),
      scheduledFor: z.string().optional().describe('Scheduled execution time'),
      startedAt: z.string().optional().describe('Actual start time'),
      finishedAt: z.string().optional().describe('Finish time')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Unique run ID'),
      taskId: z.string().describe('Associated task ID'),
      taskName: z.string().describe('Task name'),
      status: z.string().describe('Run status'),
      scheduledFor: z.string().optional().describe('Scheduled execution time'),
      startedAt: z.string().optional().describe('Actual start time'),
      finishedAt: z.string().optional().describe('Finish time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let tasksResult = await client.listTasks({ limit: 100 });
      let tasks = tasksResult.tasks || [];

      let lastPollTime =
        (ctx.state as any)?.lastPollTime ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let inputs: any[] = [];
      let latestFinished = lastPollTime;

      for (let task of tasks) {
        try {
          let runsResult = await client.getTaskRuns(task.id, {
            afterTime: lastPollTime,
            limit: 50
          });

          let runs = runsResult.runs || [];

          for (let run of runs) {
            if (run.status === 'scheduled') continue;

            inputs.push({
              runId: run.id,
              taskId: task.id,
              taskName: task.name,
              status: run.status,
              scheduledFor: run.scheduledFor,
              startedAt: run.startedAt,
              finishedAt: run.finishedAt
            });

            if (run.finishedAt && run.finishedAt > latestFinished) {
              latestFinished = run.finishedAt;
            }
          }
        } catch {
          // Skip tasks that error (e.g. deleted between list and run fetch)
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: latestFinished
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `task_run.${ctx.input.status}`,
        id: ctx.input.runId,
        output: {
          runId: ctx.input.runId,
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          status: ctx.input.status,
          scheduledFor: ctx.input.scheduledFor,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt
        }
      };
    }
  })
  .build();
