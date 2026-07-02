import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { conciseTaskSchema } from '../lib/types';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when tasks are created or updated in Dart. Polls for recently changed tasks and emits events for new and modified tasks.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of task event'),
      taskId: z.string().describe('Task ID'),
      task: z.any().describe('Task data from API')
    })
  )
  .output(conciseTaskSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownTaskIds = (ctx.state?.knownTaskIds as string[] | undefined) ?? [];

      let now = new Date().toISOString();

      let params: Record<string, any> = {
        ordering: ['-updated_at'],
        limit: 50,
        noDefaults: true
      };

      if (lastPollTime) {
        params.updatedAtAfter = lastPollTime;
      }

      let result = await client.listTasks(params);

      let inputs = result.results.map(task => {
        let isNew = !knownTaskIds.includes(task.taskId);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          taskId: task.taskId,
          task
        };
      });

      let newKnownIds = [
        ...new Set([...knownTaskIds, ...result.results.map(t => t.taskId)])
      ].slice(-1000); // Keep last 1000 IDs to avoid unbounded growth

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownTaskIds: newKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let task = ctx.input.task;
      return {
        type: `task.${ctx.input.eventType}`,
        id: `${ctx.input.taskId}-${ctx.input.eventType}-${task.updatedAt ?? Date.now()}`,
        output: task
      };
    }
  })
  .build();
