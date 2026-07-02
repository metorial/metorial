import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a Microsoft To Do task list. Supports title, body, due date, reminder, importance, status, categories, and recurrence.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskListId: z.string().describe('The ID of the task list to create the task in'),
      title: z.string().describe('Title of the task'),
      bodyContent: z.string().optional().describe('Body/notes for the task'),
      bodyContentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe('Content type of the body'),
      importance: z.enum(['low', 'normal', 'high']).optional(),
      status: z
        .enum(['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred'])
        .optional(),
      dueDateTime: z.string().optional().describe('Due date and time in ISO 8601 format'),
      dueTimeZone: z.string().optional().describe('Time zone for the due date (e.g., "UTC")'),
      reminderDateTime: z
        .string()
        .optional()
        .describe('Reminder date and time in ISO 8601 format'),
      reminderTimeZone: z.string().optional().describe('Time zone for the reminder'),
      categories: z.array(z.string()).optional()
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      title: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let task = await client.createTask(ctx.input.taskListId, {
      title: ctx.input.title,
      body: ctx.input.bodyContent
        ? {
            contentType: ctx.input.bodyContentType,
            content: ctx.input.bodyContent
          }
        : undefined,
      importance: ctx.input.importance,
      status: ctx.input.status,
      dueDateTime:
        ctx.input.dueDateTime && ctx.input.dueTimeZone
          ? {
              dateTime: ctx.input.dueDateTime,
              timeZone: ctx.input.dueTimeZone
            }
          : undefined,
      reminderDateTime:
        ctx.input.reminderDateTime && ctx.input.reminderTimeZone
          ? {
              dateTime: ctx.input.reminderDateTime,
              timeZone: ctx.input.reminderTimeZone
            }
          : undefined,
      isReminderOn: ctx.input.reminderDateTime ? true : undefined,
      categories: ctx.input.categories
    });

    return {
      output: {
        taskId: task.id,
        title: task.title,
        status: task.status
      },
      message: `Created task **"${task.title}"**.`
    };
  })
  .build();
