import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task within a project. Tasks can include descriptions, dates, billing info, and user/team assignments. Use the recurring option for repeating tasks.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to create the task in'),
      taskName: z.string().describe('Name of the new task'),
      description: z.string().optional().describe('Task description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      notes: z.string().optional().describe('Additional notes'),
      startDate: z.string().optional().describe('Start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('Due date (yyyymmdd format)'),
      estimatedHours: z.number().optional().describe('Estimated hours to complete'),
      estimatedCost: z.number().optional().describe('Estimated cost'),
      hourlyRate: z.number().optional().describe('Hourly rate for billing'),
      fixedPrice: z.number().optional().describe('Fixed price for the task'),
      active: z.boolean().optional().describe('Whether the task is active'),
      important: z.boolean().optional().describe('Whether the task is important'),
      recurring: z
        .enum(['D', 'W', 'M', 'Q', 'S', 'Y'])
        .optional()
        .describe(
          'Recurrence: D=Daily, W=Weekly, M=Monthly, Q=Quarterly, S=Semi-annually, Y=Yearly'
        ),
      userIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
      teamIds: z.array(z.number()).optional().describe('Array of team IDs to assign')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      taskName: z.string().describe('Name of the created task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createTask(ctx.input.projectId, {
      taskName: ctx.input.taskName,
      description: ctx.input.description,
      tags: ctx.input.tags,
      notes: ctx.input.notes,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      estimatedHours: ctx.input.estimatedHours,
      estimatedCost: ctx.input.estimatedCost,
      hourlyRate: ctx.input.hourlyRate,
      fixedPrice: ctx.input.fixedPrice,
      active: ctx.input.active,
      important: ctx.input.important,
      recurring: ctx.input.recurring,
      users: ctx.input.userIds,
      teams: ctx.input.teamIds
    });

    let t = result?.data?.[0] || result?.data || result;

    return {
      output: {
        taskId: String(t.task_id),
        taskName: t.task_name || ctx.input.taskName
      },
      message: `Created task **${t.task_name || ctx.input.taskName}** in project ${ctx.input.projectId}.`
    };
  })
  .build();
