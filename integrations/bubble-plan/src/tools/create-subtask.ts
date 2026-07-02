import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSubtask = SlateTool.create(spec, {
  name: 'Create Subtask',
  key: 'create_subtask',
  description: `Create a new subtask under a parent task. Subtasks allow breaking work into smaller units within a task.`
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the parent task'),
      subtaskName: z.string().describe('Name of the new subtask'),
      description: z.string().optional().describe('Subtask description'),
      color: z.string().optional().describe('Subtask color (hex code)'),
      notes: z.string().optional().describe('Additional notes'),
      startDate: z.string().optional().describe('Start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('Due date (yyyymmdd format)'),
      active: z.boolean().optional().describe('Whether the subtask is active'),
      important: z.boolean().optional().describe('Whether the subtask is important'),
      notifications: z.boolean().optional().describe('Whether notifications are enabled'),
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
      subtaskId: z.string().describe('ID of the created subtask'),
      subtaskName: z.string().describe('Name of the created subtask')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createSubtask(ctx.input.taskId, {
      subtaskName: ctx.input.subtaskName,
      description: ctx.input.description,
      color: ctx.input.color,
      notes: ctx.input.notes,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      active: ctx.input.active,
      important: ctx.input.important,
      notifications: ctx.input.notifications,
      recurring: ctx.input.recurring,
      users: ctx.input.userIds,
      teams: ctx.input.teamIds
    });

    let s = result?.data?.[0] || result?.data || result;

    return {
      output: {
        subtaskId: String(s.subtask_id),
        subtaskName: s.subtask_name || ctx.input.subtaskName
      },
      message: `Created subtask **${s.subtask_name || ctx.input.subtaskName}** under task ${ctx.input.taskId}.`
    };
  })
  .build();
