import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task or project in TimeCamp. Modify the name, parent, tags, description, billable status, budget, or assigned users.`
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      name: z.string().optional().describe('Updated task name'),
      parentId: z.number().optional().describe('Updated parent task ID'),
      tags: z.string().optional().describe('Updated comma-separated tags'),
      note: z.string().optional().describe('Updated description'),
      billable: z.boolean().optional().describe('Updated billable status'),
      budgetUnit: z.string().optional().describe('Updated budget unit'),
      budgeted: z.string().optional().describe('Updated budgeted time'),
      archived: z.boolean().optional().describe('Whether to archive the task'),
      userIds: z.string().optional().describe('Updated comma-separated user IDs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateTask({
      taskId: ctx.input.taskId,
      name: ctx.input.name,
      parentId: ctx.input.parentId,
      tags: ctx.input.tags,
      note: ctx.input.note,
      billable: ctx.input.billable !== undefined ? (ctx.input.billable ? 1 : 0) : undefined,
      budgetUnit: ctx.input.budgetUnit,
      budgeted: ctx.input.budgeted,
      archived: ctx.input.archived !== undefined ? (ctx.input.archived ? 1 : 0) : undefined,
      userIds: ctx.input.userIds
    });

    return {
      output: {
        taskId: String(ctx.input.taskId)
      },
      message: `Updated task **${ctx.input.taskId}**.`
    };
  })
  .build();
