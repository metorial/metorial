import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskUpdated = SlateTrigger.create(spec, {
  name: 'Task Updated',
  key: 'task_updated',
  description: 'Triggers when a task is updated in Bonsai.'
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task'),
      title: z.string().optional().describe('Task title'),
      projectId: z.string().optional().describe('Project ID'),
      assigneeEmail: z.string().optional().describe('Assignee email'),
      priority: z.string().optional().describe('Task priority'),
      status: z.string().optional().describe('Task status'),
      dueDate: z.string().optional().describe('Due date'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      title: z.string().optional().describe('Task title'),
      projectId: z.string().optional().describe('Project ID'),
      assigneeEmail: z.string().optional().describe('Assignee email'),
      priority: z.string().optional().describe('Task priority'),
      status: z.string().optional().describe('Task status'),
      dueDate: z.string().optional().describe('Due date'),
      eventTimestamp: z.string().optional().describe('When the update occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let task = data.task ?? data.resource ?? data;

      return {
        inputs: [
          {
            taskId: task.id ?? task.task_id ?? data.id ?? '',
            title: task.title ?? task.name ?? undefined,
            projectId: task.project_id ?? task.projectId ?? undefined,
            assigneeEmail: task.assignee_email ?? task.assigneeEmail ?? undefined,
            priority: task.priority ?? undefined,
            status: task.status ?? undefined,
            dueDate: task.due_date ?? task.dueDate ?? undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.updated',
        id: `task-${ctx.input.taskId}-updated-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          title: ctx.input.title,
          projectId: ctx.input.projectId,
          assigneeEmail: ctx.input.assigneeEmail,
          priority: ctx.input.priority,
          status: ctx.input.status,
          dueDate: ctx.input.dueDate,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
