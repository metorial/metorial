import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

export let updatedTaskTrigger = SlateTrigger.create(spec, {
  name: 'Updated Task',
  key: 'updated_task',
  description:
    'Triggers when an existing task is updated in Nozbe Teams. Detects changes to name, assignment, due date, completion status, and other task properties.'
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID'),
      name: z.string().describe('Task name'),
      projectId: z.string().optional().describe('Project ID'),
      responsibleId: z.string().nullable().optional().describe('Responsible user ID'),
      lastModified: z.number().optional().describe('Last modification timestamp'),
      endedAt: z.number().nullable().optional().describe('Completion timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date timestamp'),
      isAbandoned: z.boolean().optional().describe('Whether the task is abandoned'),
      priorityPosition: z.number().nullable().optional().describe('Priority position')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      name: z.string().describe('Task name'),
      projectId: z.string().optional().describe('Project ID'),
      responsibleId: z.string().nullable().optional().describe('Responsible user ID'),
      lastModified: z.number().optional().describe('Last modification timestamp'),
      endedAt: z.number().nullable().optional().describe('Completion timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date timestamp'),
      isAbandoned: z.boolean().optional().describe('Whether the task is abandoned'),
      priorityPosition: z.number().nullable().optional().describe('Priority position')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let params: ListParams = {
        sortBy: '-last_modified',
        limit: 50
      };

      let lastPollTimestamp = ctx.state?.lastPollTimestamp as number | undefined;
      if (lastPollTimestamp) {
        params['last_modified[min]'] = lastPollTimestamp + 1;
      }

      let tasks = await client.listTasks(params);

      let newTimestamp = lastPollTimestamp;
      if (tasks.length > 0) {
        newTimestamp = Math.max(...tasks.map((t: any) => t.last_modified || 0));
      }

      return {
        inputs: tasks.map((t: any) => ({
          taskId: t.id,
          name: t.name,
          projectId: t.project_id,
          responsibleId: t.responsible_id,
          lastModified: t.last_modified,
          endedAt: t.ended_at,
          dueAt: t.due_at,
          isAbandoned: t.is_abandoned,
          priorityPosition: t.priority_position
        })),
        updatedState: {
          lastPollTimestamp: newTimestamp ?? Date.now()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.updated',
        id: `${ctx.input.taskId}-${ctx.input.lastModified}`,
        output: {
          taskId: ctx.input.taskId,
          name: ctx.input.name,
          projectId: ctx.input.projectId,
          responsibleId: ctx.input.responsibleId,
          lastModified: ctx.input.lastModified,
          endedAt: ctx.input.endedAt,
          dueAt: ctx.input.dueAt,
          isAbandoned: ctx.input.isAbandoned,
          priorityPosition: ctx.input.priorityPosition
        }
      };
    }
  })
  .build();
