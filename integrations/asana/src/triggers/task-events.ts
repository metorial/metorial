import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'New Tasks',
  key: 'new_tasks',
  description: 'Temporarily disabled while Asana trigger scoping is redesigned.'
})
  .input(
    z.object({
      taskId: z.string().describe('GID of the new task'),
      taskName: z.string().describe('Name of the new task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to'),
      tags: z.array(z.any()).optional().describe('Tags on the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('GID of the new task'),
      taskName: z.string().describe('Name of the new task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to'),
      tags: z.array(z.any()).optional().describe('Tags on the task')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      ctx.warn('Asana triggers are temporarily disabled.');
      return { inputs: [], updatedState: ctx.state };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.created',
        id: `${ctx.input.taskId}-created-${ctx.input.createdAt || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          assignee: ctx.input.assignee,
          completed: ctx.input.completed,
          createdAt: ctx.input.createdAt,
          dueOn: ctx.input.dueOn,
          modifiedAt: ctx.input.modifiedAt,
          notes: ctx.input.notes,
          projects: ctx.input.projects,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();
