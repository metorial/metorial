import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

export let newTaskTrigger = SlateTrigger.create(spec, {
  name: 'New Task',
  key: 'new_task',
  description:
    'Triggers when a new task is created in Nozbe Teams. Optionally filter by project or responsible user.'
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID'),
      name: z.string().describe('Task name'),
      projectId: z.string().optional().describe('Project ID'),
      authorId: z.string().optional().describe('Author user ID'),
      responsibleId: z.string().nullable().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date timestamp'),
      priorityPosition: z.number().nullable().optional().describe('Priority position')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      name: z.string().describe('Task name'),
      projectId: z.string().optional().describe('Project ID'),
      authorId: z.string().optional().describe('Author user ID'),
      responsibleId: z.string().nullable().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date timestamp'),
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
        sortBy: '-created_at',
        limit: 50
      };

      // Use created_at min filter to only get new tasks since last poll
      let lastPollTimestamp = ctx.state?.lastPollTimestamp as number | undefined;
      if (lastPollTimestamp) {
        params['created_at[min]'] = lastPollTimestamp + 1;
      }

      let tasks = await client.listTasks(params);

      let newTimestamp = lastPollTimestamp;
      if (tasks.length > 0) {
        newTimestamp = Math.max(...tasks.map((t: any) => t.created_at || 0));
      }

      return {
        inputs: tasks.map((t: any) => ({
          taskId: t.id,
          name: t.name,
          projectId: t.project_id,
          authorId: t.author_id,
          responsibleId: t.responsible_id,
          createdAt: t.created_at,
          dueAt: t.due_at,
          priorityPosition: t.priority_position
        })),
        updatedState: {
          lastPollTimestamp: newTimestamp ?? Date.now()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.created',
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          name: ctx.input.name,
          projectId: ctx.input.projectId,
          authorId: ctx.input.authorId,
          responsibleId: ctx.input.responsibleId,
          createdAt: ctx.input.createdAt,
          dueAt: ctx.input.dueAt,
          priorityPosition: ctx.input.priorityPosition
        }
      };
    }
  })
  .build();
