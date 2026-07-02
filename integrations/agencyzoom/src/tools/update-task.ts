import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update, complete, or reopen a task in AgencyZoom. Use "update" to modify task fields, "complete" to mark a task as done, or "reopen" to reopen a completed task with an optional comment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update, complete, or reopen'),
      action: z
        .enum(['update', 'complete', 'reopen'])
        .describe('Action to perform on the task'),
      title: z.string().optional().describe('New title for the task (for "update" action)'),
      type: z
        .enum(['to-do', 'email', 'call', 'meeting'])
        .optional()
        .describe('New task type (for "update" action)'),
      assigneeId: z.string().optional().describe('New assignee ID (for "update" action)'),
      dueDate: z
        .string()
        .optional()
        .describe('New due date (for "update" action, ISO date string)'),
      dueTime: z
        .string()
        .optional()
        .describe('New due time (for "update" action, e.g. "14:00")'),
      duration: z
        .number()
        .optional()
        .describe('New duration in minutes (for "update" action)'),
      notes: z.string().optional().describe('New notes for the task (for "update" action)'),
      comment: z
        .string()
        .optional()
        .describe('Comment when reopening a task (for "reopen" action)')
    })
  )
  .output(
    z.object({
      task: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated task data (for "update" and "reopen" actions)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for "complete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    switch (ctx.input.action) {
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.title !== undefined) data.title = ctx.input.title;
        if (ctx.input.type !== undefined) data.type = ctx.input.type;
        if (ctx.input.assigneeId !== undefined) data.assigneeId = ctx.input.assigneeId;
        if (ctx.input.dueDate !== undefined) data.dueDate = ctx.input.dueDate;
        if (ctx.input.dueTime !== undefined) data.dueTime = ctx.input.dueTime;
        if (ctx.input.duration !== undefined) data.duration = ctx.input.duration;
        if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;

        let result = await client.updateTask(ctx.input.taskId, data);
        return {
          output: { task: result },
          message: `Updated task **${ctx.input.taskId}**.`
        };
      }
      case 'complete': {
        await client.completeTask(ctx.input.taskId);
        return {
          output: { success: true },
          message: `Marked task **${ctx.input.taskId}** as complete.`
        };
      }
      case 'reopen': {
        let reopenData: Record<string, any> = {};
        if (ctx.input.comment !== undefined) reopenData.comment = ctx.input.comment;

        let result = await client.reopenTask(ctx.input.taskId, reopenData);
        return {
          output: { task: result },
          message: `Reopened task **${ctx.input.taskId}**.`
        };
      }
    }
  })
  .build();
