import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let completeTask = SlateTool.create(spec, {
  name: 'Complete Task',
  key: 'complete_task',
  description: `Mark a task as complete (close) or reopen a previously completed task. For recurring tasks, completing advances to the next occurrence.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to complete or reopen'),
      action: z.enum(['complete', 'reopen']).describe('Whether to complete or reopen the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'complete') {
      await client.closeTask(ctx.input.taskId);
    } else {
      await client.reopenTask(ctx.input.taskId);
    }

    return {
      output: {
        taskId: ctx.input.taskId,
        action: ctx.input.action
      },
      message:
        ctx.input.action === 'complete'
          ? `Completed task (ID: ${ctx.input.taskId}).`
          : `Reopened task (ID: ${ctx.input.taskId}).`
    };
  });
