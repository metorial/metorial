import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update a task's status or due date within a workflow run. Use this to complete or uncomplete tasks and set due dates. Tasks with required form fields must have those fields filled before they can be completed.`,
  instructions: [
    'Use status "Completed" to check/complete a task, or "NotCompleted" to uncheck it.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run containing the task'),
      taskId: z.string().describe('ID of the task to update'),
      status: z
        .enum(['Completed', 'NotCompleted'])
        .optional()
        .describe('New status for the task'),
      dueDate: z
        .string()
        .optional()
        .describe('New due date in ISO 8601 format, or empty string to clear')
    })
  )
  .output(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run'),
      taskId: z.string().describe('ID of the updated task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let current = await client.getTask(ctx.input.workflowRunId, ctx.input.taskId);

    let updateData: { status: string; dueDate?: string | null } = {
      status: ctx.input.status ?? current.status
    };

    if (ctx.input.dueDate !== undefined) {
      updateData.dueDate = ctx.input.dueDate === '' ? null : ctx.input.dueDate;
    } else {
      updateData.dueDate = current.dueDate ?? null;
    }

    await client.updateTask(ctx.input.workflowRunId, ctx.input.taskId, updateData);

    return {
      output: {
        workflowRunId: ctx.input.workflowRunId,
        taskId: ctx.input.taskId
      },
      message: `Updated task **${current.name || ctx.input.taskId}** to status **${updateData.status}**.`
    };
  })
  .build();
