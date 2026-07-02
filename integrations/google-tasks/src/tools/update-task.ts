import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update properties of an existing task. Supports modifying the title, notes, due date, and completion status. Only the provided fields will be updated; omitted fields remain unchanged.`,
  instructions: [
    'Set status to "completed" to mark a task as done, or "needsAction" to reopen it.',
    'Due dates should be in RFC 3339 format; the time portion is discarded.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleTasksActionScopes.updateTask)
  .input(
    z.object({
      taskListId: z.string().describe('ID of the task list containing the task'),
      taskId: z.string().describe('ID of the task to update'),
      title: z.string().optional().describe('New title for the task'),
      notes: z.string().optional().describe('New description/notes for the task'),
      due: z
        .string()
        .optional()
        .describe('New due date in RFC 3339 format (time portion is discarded)'),
      status: z.enum(['needsAction', 'completed']).optional().describe('New task status')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      title: z.string().optional().describe('Title of the updated task'),
      notes: z.string().optional().describe('Description/notes of the task'),
      status: z.string().optional().describe('Status of the task'),
      due: z.string().optional().describe('Due date of the task'),
      completed: z.string().optional().describe('Completion date if completed'),
      updated: z.string().optional().describe('Last modification time in RFC 3339 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleTasksClient(ctx.auth.token);

    let updateData: Record<string, unknown> = {};
    if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
    if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
    if (ctx.input.due !== undefined) updateData.due = ctx.input.due;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;

    let task = await client.updateTask(ctx.input.taskListId, ctx.input.taskId, updateData);

    return {
      output: {
        taskId: task.id!,
        title: task.title,
        notes: task.notes,
        status: task.status,
        due: task.due,
        completed: task.completed,
        updated: task.updated
      },
      message: `Updated task **"${task.title ?? task.id}"**.`
    };
  })
  .build();
