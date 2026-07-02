import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Agiled. Change the title, description, assignee, due date, priority, or mark it as complete.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      title: z.string().optional().describe('Updated task title'),
      description: z.string().optional().describe('Updated task description'),
      projectId: z.string().optional().describe('Updated project ID'),
      assignedTo: z.string().optional().describe('Updated assignee user ID'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      startDate: z.string().optional().describe('Updated start date (YYYY-MM-DD)'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('Updated priority'),
      markComplete: z.boolean().optional().describe('Set to true to mark the task as complete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      title: z.string().optional().describe('Updated task title')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.markComplete) {
      let result = await client.completeTask(ctx.input.taskId);
      let task = result.data;
      return {
        output: {
          taskId: String(task.id ?? ctx.input.taskId),
          title: task.heading as string | undefined
        },
        message: `Marked task **${ctx.input.taskId}** as complete.`
      };
    }

    let updateData: Record<string, unknown> = {};
    if (ctx.input.title !== undefined) updateData.heading = ctx.input.title;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.projectId !== undefined) updateData.project_id = ctx.input.projectId;
    if (ctx.input.assignedTo !== undefined) updateData.user_id = ctx.input.assignedTo;
    if (ctx.input.dueDate !== undefined) updateData.due_date = ctx.input.dueDate;
    if (ctx.input.startDate !== undefined) updateData.start_date = ctx.input.startDate;
    if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;

    let result = await client.updateTask(ctx.input.taskId, updateData);
    let task = result.data;

    return {
      output: {
        taskId: String(task.id ?? ctx.input.taskId),
        title: task.heading as string | undefined
      },
      message: `Updated task **${ctx.input.taskId}**.`
    };
  })
  .build();
