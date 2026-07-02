import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let taskChanges = SlateTrigger.create(spec, {
  name: 'Task Changes',
  key: 'task_changes',
  description:
    'Triggers when tasks are created or modified in Firmao. Polls for recently modified task records.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      taskId: z.number().describe('ID of the changed task'),
      raw: z.any().describe('Full task record from the API')
    })
  )
  .output(
    z.object({
      taskId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      taskType: z.string().optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      projectId: z.number().optional(),
      projectName: z.string().optional(),
      creationDate: z.string().optional(),
      lastModificationDate: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FirmaoClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let filters: Record<string, string> = {};
      if (lastPollTime) {
        filters['lastModificationDate(gt)'] = lastPollTime;
      }

      let result = await client.list('tasks', {
        sort: 'lastModificationDate',
        dir: 'DESC',
        limit: 50,
        filters
      });

      let now = new Date().toISOString();

      let inputs = result.data.map((t: any) => {
        let isNew =
          !lastPollTime || (t.creationDate && t.creationDate === t.lastModificationDate);
        return {
          changeType: isNew ? ('created' as const) : ('updated' as const),
          taskId: t.id,
          raw: t
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime:
            result.data.length > 0
              ? (result.data[0].lastModificationDate ?? now)
              : (lastPollTime ?? now)
        }
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.raw;
      return {
        type: `task.${ctx.input.changeType}`,
        id: `task-${ctx.input.taskId}-${t.lastModificationDate ?? Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          name: t.name,
          description: t.description,
          status: t.status,
          priority: t.priority,
          taskType: t.taskType,
          plannedStartDate: t.plannedStartDate,
          plannedEndDate: t.plannedEndDate,
          projectId: typeof t.project === 'object' ? t.project?.id : t.project,
          projectName: typeof t.project === 'object' ? t.project?.name : undefined,
          creationDate: t.creationDate,
          lastModificationDate: t.lastModificationDate
        }
      };
    }
  })
  .build();
