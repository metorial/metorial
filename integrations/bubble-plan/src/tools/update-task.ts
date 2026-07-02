import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Project Bubble. Modify the name, description, dates, progress, billing, or assignments. Also supports completing or resuming a task. Only provided fields will be updated.`,
  instructions: [
    'To complete a task, set the "completed" field to true. Completing a task also completes all subtasks.',
    'To resume a completed task, set the "resume" field to true. Resuming a task does not change the status of subtasks.'
  ]
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      taskName: z.string().optional().describe('New task name'),
      description: z.string().optional().describe('New task description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      notes: z.string().optional().describe('Additional notes'),
      startDate: z.string().optional().describe('New start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('New due date (yyyymmdd format)'),
      progress: z.number().min(0).max(100).optional().describe('Progress percentage (0-100)'),
      estimatedHours: z.number().optional().describe('Estimated hours'),
      hourlyRate: z.number().optional().describe('Hourly rate'),
      fixedPrice: z.number().optional().describe('Fixed price'),
      active: z.boolean().optional().describe('Whether the task is active'),
      important: z.boolean().optional().describe('Whether the task is important'),
      recurring: z
        .enum(['D', 'W', 'M', 'Q', 'S', 'Y'])
        .optional()
        .describe('Recurrence pattern'),
      completed: z.boolean().optional().describe('Set to true to mark the task as completed'),
      resume: z.boolean().optional().describe('Set to true to resume a completed task'),
      userIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
      teamIds: z.array(z.number()).optional().describe('Array of team IDs to assign')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      taskName: z.string().describe('Name of the updated task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result: any;

    if (ctx.input.completed) {
      result = await client.completeTask(ctx.input.taskId);
    } else if (ctx.input.resume) {
      result = await client.resumeTask(ctx.input.taskId);
    } else {
      result = await client.updateTask(ctx.input.taskId, {
        taskName: ctx.input.taskName,
        description: ctx.input.description,
        tags: ctx.input.tags,
        notes: ctx.input.notes,
        startDate: ctx.input.startDate,
        dueDate: ctx.input.dueDate,
        progress: ctx.input.progress,
        estimatedHours: ctx.input.estimatedHours,
        hourlyRate: ctx.input.hourlyRate,
        fixedPrice: ctx.input.fixedPrice,
        active: ctx.input.active,
        important: ctx.input.important,
        recurring: ctx.input.recurring,
        users: ctx.input.userIds,
        teams: ctx.input.teamIds
      });
    }

    let t = result?.data?.[0] || result?.data || result;

    let action = ctx.input.completed ? 'Completed' : ctx.input.resume ? 'Resumed' : 'Updated';

    return {
      output: {
        taskId: String(t.task_id || ctx.input.taskId),
        taskName: t.task_name || ''
      },
      message: `${action} task **${t.task_name || ctx.input.taskId}**.`
    };
  })
  .build();
