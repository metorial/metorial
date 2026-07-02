import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Update or delete a Microsoft To Do task. Use **action** to specify the operation. For updates, only the provided fields will be changed. Supports changing title, status, due date, importance, and more.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskListId: z.string().describe('The ID of the task list containing the task'),
      taskId: z.string().describe('The ID of the task to manage'),
      action: z.enum(['update', 'delete']).describe('The action to perform'),
      title: z.string().optional(),
      bodyContent: z.string().optional(),
      bodyContentType: z.enum(['text', 'html']).optional(),
      importance: z.enum(['low', 'normal', 'high']).optional(),
      status: z
        .enum(['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred'])
        .optional(),
      dueDateTime: z
        .string()
        .optional()
        .describe('Due date/time in ISO 8601 format. Set to empty string to clear.'),
      dueTimeZone: z.string().optional(),
      reminderDateTime: z
        .string()
        .optional()
        .describe('Reminder date/time in ISO 8601 format. Set to empty string to clear.'),
      reminderTimeZone: z.string().optional(),
      categories: z.array(z.string()).optional()
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      taskId: z.string(),
      title: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { taskListId, taskId, action } = ctx.input;

    if (action === 'delete') {
      await client.deleteTask(taskListId, taskId);
      return {
        output: { success: true, taskId },
        message: `Deleted task **${taskId}**.`
      };
    }

    let updates: Record<string, any> = {};
    if (ctx.input.title !== undefined) updates.title = ctx.input.title;
    if (ctx.input.bodyContent !== undefined) {
      updates.body = {
        contentType: ctx.input.bodyContentType || 'text',
        content: ctx.input.bodyContent
      };
    }
    if (ctx.input.importance !== undefined) updates.importance = ctx.input.importance;
    if (ctx.input.status !== undefined) updates.status = ctx.input.status;
    if (ctx.input.categories !== undefined) updates.categories = ctx.input.categories;

    if (ctx.input.dueDateTime !== undefined) {
      if (ctx.input.dueDateTime === '') {
        updates.dueDateTime = null;
      } else if (ctx.input.dueTimeZone) {
        updates.dueDateTime = {
          dateTime: ctx.input.dueDateTime,
          timeZone: ctx.input.dueTimeZone
        };
      }
    }

    if (ctx.input.reminderDateTime !== undefined) {
      if (ctx.input.reminderDateTime === '') {
        updates.reminderDateTime = null;
        updates.isReminderOn = false;
      } else if (ctx.input.reminderTimeZone) {
        updates.reminderDateTime = {
          dateTime: ctx.input.reminderDateTime,
          timeZone: ctx.input.reminderTimeZone
        };
        updates.isReminderOn = true;
      }
    }

    let updated = await client.updateTask(taskListId, taskId, updates);

    return {
      output: {
        success: true,
        taskId: updated.id,
        title: updated.title,
        status: updated.status
      },
      message: `Updated task **"${updated.title}"**.`
    };
  })
  .build();
