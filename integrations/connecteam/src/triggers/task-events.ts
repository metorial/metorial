import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let taskEventTypes = ['task_published', 'task_completed'] as const;

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when Quick Tasks are published or completed. Recurring tasks do not trigger the task_published event. Multiple tasks created at once may be sent in a single webhook.'
})
  .input(
    z.object({
      eventType: z.enum(taskEventTypes).describe('Type of task event'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      requestId: z.string().describe('Unique request ID'),
      taskId: z.string().describe('Task ID'),
      taskBoardId: z.number().describe('Task board ID'),
      title: z.string().describe('Task title'),
      userIds: z.array(z.number()).optional().describe('Assigned user IDs'),
      status: z.string().optional().describe('Task status'),
      taskType: z.string().optional().describe('Task type: oneTime or recurring'),
      startTime: z.number().optional().describe('Start time Unix timestamp'),
      dueDate: z.number().optional().describe('Due date Unix timestamp'),
      labelIds: z.array(z.any()).optional().describe('Label IDs'),
      isArchived: z.boolean().optional().describe('Whether task is archived')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      taskBoardId: z.number().describe('Task board ID'),
      title: z.string().describe('Task title'),
      userIds: z.array(z.number()).optional().describe('Assigned user IDs'),
      status: z.string().optional().describe('Task status'),
      taskType: z.string().optional().describe('Task type: oneTime or recurring'),
      startTime: z.number().optional().describe('Start time Unix timestamp'),
      dueDate: z.number().optional().describe('Due date Unix timestamp'),
      labelIds: z.array(z.any()).optional().describe('Label IDs'),
      isArchived: z.boolean().optional().describe('Whether task is archived')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.eventType as (typeof taskEventTypes)[number];
      let data = body.data;

      // Task webhooks send data as an array of task objects
      let tasks = Array.isArray(data) ? data : [data];

      return {
        inputs: tasks.map((task: any) => ({
          eventType,
          eventTimestamp: body.eventTimestamp ?? Math.floor(Date.now() / 1000),
          requestId: body.requestId ?? `task_${Date.now()}`,
          taskId: task.id ?? '',
          taskBoardId: task.taskBoardId ?? 0,
          title: task.title ?? '',
          userIds: task.userIds,
          status: task.status,
          taskType: task.type,
          startTime: task.startTime,
          dueDate: task.dueDate,
          labelIds: task.labelIds,
          isArchived: task.isArchived
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: `task.${ctx.input.eventType.replace('task_', '')}`,
        id: `${ctx.input.requestId}_${ctx.input.taskId}`,
        output: {
          taskId: ctx.input.taskId,
          taskBoardId: ctx.input.taskBoardId,
          title: ctx.input.title,
          userIds: ctx.input.userIds,
          status: ctx.input.status,
          taskType: ctx.input.taskType,
          startTime: ctx.input.startTime,
          dueDate: ctx.input.dueDate,
          labelIds: ctx.input.labelIds,
          isArchived: ctx.input.isArchived
        }
      };
    }
  })
  .build();
