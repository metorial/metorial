import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in JobNimbus. Can mark tasks as completed, change priority, update dates, and more. Only the fields you provide will be updated.`
})
  .input(
    z.object({
      taskId: z.string().describe('The unique JobNimbus ID (jnid) of the task to update'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.number().optional().describe('Task priority (numeric value)'),
      isCompleted: z
        .boolean()
        .optional()
        .describe('Set to true to mark the task as completed'),
      dateStart: z.number().optional().describe('Start date as Unix timestamp'),
      dateEnd: z.number().optional().describe('Due date as Unix timestamp'),
      owners: z.array(z.string()).optional().describe('Assignee user IDs'),
      tags: z.array(z.string()).optional().describe('Tags (replaces existing tags)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique JobNimbus ID of the updated task'),
      title: z.string().optional().describe('Task title'),
      isCompleted: z.boolean().optional().describe('Whether the task is completed'),
      dateUpdated: z.number().optional().describe('Unix timestamp of last update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;
    if (ctx.input.isCompleted !== undefined) data.is_completed = ctx.input.isCompleted;
    if (ctx.input.dateStart !== undefined) data.date_start = ctx.input.dateStart;
    if (ctx.input.dateEnd !== undefined) data.date_end = ctx.input.dateEnd;
    if (ctx.input.owners !== undefined) data.owners = ctx.input.owners;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;

    let result = await client.updateTask(ctx.input.taskId, data);

    return {
      output: {
        taskId: result.jnid,
        title: result.title,
        isCompleted: result.is_completed,
        dateUpdated: result.date_updated
      },
      message: `Updated task **${result.title || result.jnid}**${ctx.input.isCompleted ? ' (marked as completed)' : ''}.`
    };
  })
  .build();
