import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTaskTrigger = SlateTrigger.create(spec, {
  name: 'New Task',
  key: 'new_task',
  description: 'Triggers when a new task is created in Agiled.'
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task'),
      task: z.record(z.string(), z.unknown()).describe('Task record from Agiled')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the new task'),
      title: z.string().optional().describe('Task title'),
      projectId: z.string().optional().describe('Associated project ID'),
      assignedTo: z.string().optional().describe('Assigned user ID'),
      dueDate: z.string().optional().describe('Task due date'),
      priority: z.string().optional().describe('Task priority'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listTasks(1, 50);
      let tasks = result.data;

      let newTasks = lastKnownId ? tasks.filter(t => Number(t.id) > lastKnownId) : [];

      let maxId = tasks.reduce((max, t) => Math.max(max, Number(t.id) || 0), lastKnownId ?? 0);

      return {
        inputs: newTasks.map(t => ({
          taskId: String(t.id),
          task: t
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.task;
      return {
        type: 'task.created',
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          title: t.heading as string | undefined,
          projectId: t.project_id != null ? String(t.project_id) : undefined,
          assignedTo: t.user_id != null ? String(t.user_id) : undefined,
          dueDate: t.due_date as string | undefined,
          priority: t.priority as string | undefined,
          createdAt: t.created_at as string | undefined
        }
      };
    }
  })
  .build();
