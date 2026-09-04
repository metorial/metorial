import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Task Changes',
  key: 'task_changes',
  description: 'Temporarily disabled while Asana trigger scoping is redesigned.'
})
  .input(
    z.object({
      taskId: z.string().describe('GID of the modified task'),
      taskName: z.string().describe('Name of the modified task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      completedAt: z.string().nullable().optional().describe('When the task was completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('GID of the modified task'),
      taskName: z.string().describe('Name of the task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      completedAt: z.string().nullable().optional().describe('When the task was completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to')
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
      let isNew =
        ctx.input.createdAt &&
        ctx.input.modifiedAt &&
        ctx.input.createdAt.substring(0, 16) === ctx.input.modifiedAt.substring(0, 16);
      let eventType = isNew ? 'task.created' : 'task.updated';

      return {
        type: eventType,
        id: `${ctx.input.taskId}-${ctx.input.modifiedAt || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          assignee: ctx.input.assignee,
          completed: ctx.input.completed,
          completedAt: ctx.input.completedAt,
          createdAt: ctx.input.createdAt,
          dueOn: ctx.input.dueOn,
          modifiedAt: ctx.input.modifiedAt,
          notes: ctx.input.notes,
          projects: ctx.input.projects
        }
      };
    }
  })
  .build();
