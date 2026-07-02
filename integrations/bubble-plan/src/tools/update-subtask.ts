import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubtask = SlateTool.create(spec, {
  name: 'Update Subtask',
  key: 'update_subtask',
  description: `Update an existing subtask in Project Bubble. Modify its name, description, dates, progress, or assignments. Also supports completing or resuming a subtask.`,
  instructions: [
    'To complete a subtask, set "completed" to true. Completing a subtask updates the parent task progress.',
    'To resume a completed subtask, set "resume" to true.'
  ]
})
  .input(
    z.object({
      subtaskId: z.string().describe('ID of the subtask to update'),
      subtaskName: z.string().optional().describe('New subtask name'),
      description: z.string().optional().describe('New description'),
      color: z.string().optional().describe('Subtask color (hex code)'),
      notes: z.string().optional().describe('Additional notes'),
      startDate: z.string().optional().describe('New start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('New due date (yyyymmdd format)'),
      progress: z.number().min(0).max(100).optional().describe('Progress percentage (0-100)'),
      active: z.boolean().optional().describe('Whether the subtask is active'),
      important: z.boolean().optional().describe('Whether the subtask is important'),
      notifications: z.boolean().optional().describe('Whether notifications are enabled'),
      recurring: z
        .enum(['D', 'W', 'M', 'Q', 'S', 'Y'])
        .optional()
        .describe('Recurrence pattern'),
      completed: z
        .boolean()
        .optional()
        .describe('Set to true to mark the subtask as completed'),
      resume: z.boolean().optional().describe('Set to true to resume a completed subtask'),
      userIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
      teamIds: z.array(z.number()).optional().describe('Array of team IDs to assign')
    })
  )
  .output(
    z.object({
      subtaskId: z.string().describe('ID of the updated subtask'),
      subtaskName: z.string().describe('Name of the updated subtask')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result: any;

    if (ctx.input.completed) {
      result = await client.completeSubtask(ctx.input.subtaskId);
    } else if (ctx.input.resume) {
      result = await client.resumeSubtask(ctx.input.subtaskId);
    } else {
      result = await client.updateSubtask(ctx.input.subtaskId, {
        subtaskName: ctx.input.subtaskName,
        description: ctx.input.description,
        color: ctx.input.color,
        notes: ctx.input.notes,
        startDate: ctx.input.startDate,
        dueDate: ctx.input.dueDate,
        progress: ctx.input.progress,
        active: ctx.input.active,
        important: ctx.input.important,
        notifications: ctx.input.notifications,
        recurring: ctx.input.recurring,
        users: ctx.input.userIds,
        teams: ctx.input.teamIds
      });
    }

    let s = result?.data?.[0] || result?.data || result;

    let action = ctx.input.completed ? 'Completed' : ctx.input.resume ? 'Resumed' : 'Updated';

    return {
      output: {
        subtaskId: String(s.subtask_id || ctx.input.subtaskId),
        subtaskName: s.subtask_name || ''
      },
      message: `${action} subtask **${s.subtask_name || ctx.input.subtaskId}**.`
    };
  })
  .build();
