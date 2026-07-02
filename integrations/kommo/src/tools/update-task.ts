import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let updateTaskTool = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task. Change its text, deadline, responsible user, or mark it as completed with an optional result message.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      text: z.string().optional().describe('New task description'),
      completeTill: z.number().optional().describe('New deadline as Unix timestamp'),
      responsibleUserId: z.number().optional().describe('New responsible user ID'),
      isCompleted: z.boolean().optional().describe('Mark task as completed or incomplete'),
      resultText: z.string().optional().describe('Result/outcome text when completing a task')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the updated task'),
      updatedAt: z.number().optional().describe('Updated timestamp (Unix)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let payload: Record<string, any> = {};

    if (ctx.input.text !== undefined) payload.text = ctx.input.text;
    if (ctx.input.completeTill !== undefined) payload.complete_till = ctx.input.completeTill;
    if (ctx.input.responsibleUserId !== undefined)
      payload.responsible_user_id = ctx.input.responsibleUserId;
    if (ctx.input.isCompleted !== undefined) payload.is_completed = ctx.input.isCompleted;
    if (ctx.input.resultText !== undefined) payload.result = { text: ctx.input.resultText };

    let result = await client.updateTask(ctx.input.taskId, payload);

    return {
      output: { taskId: result.id, updatedAt: result.updated_at },
      message: `Updated task **${ctx.input.taskId}**${ctx.input.isCompleted ? ' (marked as completed)' : ''}.`
    };
  })
  .build();
