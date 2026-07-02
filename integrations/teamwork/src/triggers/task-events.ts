import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when a task is created, updated, completed, reopened, deleted, or moved in Teamwork.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of task event'),
      taskId: z.string().describe('ID of the affected task'),
      projectId: z.string().optional().describe('Project ID'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the affected task'),
      taskName: z.string().optional().describe('Task title/content'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      assigneeId: z.string().optional().describe('Assigned person ID'),
      priority: z.string().optional().describe('Task priority'),
      dueDate: z.string().optional().describe('Due date'),
      startDate: z.string().optional().describe('Start date'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      description: z.string().optional().describe('Task description'),
      taskListId: z.string().optional().describe('Task list ID'),
      updatedBy: z.string().optional().describe('ID of the user who triggered the event'),
      updatedByName: z.string().optional().describe('Name of the user who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || data;
      let task = event.task || event['todo-item'] || event.objectData || {};
      let eventType = event.event || data.event || 'unknown';
      let taskId = task.id ? String(task.id) : event.objectId ? String(event.objectId) : '';

      if (!taskId) return { inputs: [] };

      return {
        inputs: [
          {
            eventType: String(eventType),
            taskId,
            projectId: task.projectId
              ? String(task.projectId)
              : task['project-id']
                ? String(task['project-id'])
                : undefined,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let event = payload?.event || payload;
      let task = event?.task || event?.['todo-item'] || event?.objectData || {};
      let user = event?.user || event?.eventCreator || {};

      return {
        type: `task.${ctx.input.eventType.replace(/^TASK\./, '').toLowerCase()}`,
        id: `task-${ctx.input.taskId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskName: task.content || task.name || undefined,
          projectId: ctx.input.projectId || undefined,
          projectName: task.projectName || task['project-name'] || undefined,
          assigneeId: task['responsible-party-id']
            ? String(task['responsible-party-id'])
            : task.responsiblePartyId
              ? String(task.responsiblePartyId)
              : undefined,
          priority: task.priority || undefined,
          dueDate: task['due-date'] || task.dueDate || undefined,
          startDate: task['start-date'] || task.startDate || undefined,
          completed: task.completed ?? undefined,
          description: task.description || undefined,
          taskListId: task['todo-list-id']
            ? String(task['todo-list-id'])
            : task.taskListId
              ? String(task.taskListId)
              : undefined,
          updatedBy: user.id ? String(user.id) : undefined,
          updatedByName: user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : undefined
        }
      };
    }
  })
  .build();
