import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing BugHerd task's properties. Can modify description, priority, status, assignee, tags, and external ID. Supports unassigning users and moving tasks back to feedback.`,
  instructions: [
    'Set status to "feedback" to move a task back to the feedback panel.',
    'Set assignedToId to null to unassign all users.',
    'Use unassignUserId to unassign a specific user from the task.',
    'Provide updaterEmail for an audit trail of who made the change.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID containing the task'),
      taskId: z.number().describe('Global task ID to update'),
      description: z.string().optional().describe('New task description'),
      priority: z
        .enum(['not set', 'critical', 'important', 'normal', 'minor'])
        .optional()
        .describe('New priority'),
      status: z
        .string()
        .optional()
        .describe(
          'New status (e.g., "backlog", "todo", "doing", "done", "closed", "feedback", or custom column name)'
        ),
      assignedToId: z
        .number()
        .nullable()
        .optional()
        .describe('User ID to assign, or null to unassign all'),
      assignedToEmail: z.string().optional().describe('Email of the assignee'),
      unassignUserId: z
        .number()
        .optional()
        .describe('Specific user ID to unassign from the task'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('New set of tags (replaces existing tags)'),
      externalId: z.string().optional().describe('External tracking ID'),
      updaterEmail: z
        .string()
        .optional()
        .describe('Email of the user making the update (for audit trail)')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Global task ID'),
      localTaskId: z.number().describe('Project-scoped task ID'),
      status: z.string().describe('Updated status'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let task = await client.updateTask(ctx.input.projectId, ctx.input.taskId, {
      description: ctx.input.description,
      priority: ctx.input.priority,
      status: ctx.input.status,
      assignedToId: ctx.input.assignedToId ?? undefined,
      assignedToEmail: ctx.input.assignedToEmail,
      unassignUser: ctx.input.unassignUserId,
      tagNames: ctx.input.tagNames,
      externalId: ctx.input.externalId,
      updaterEmail: ctx.input.updaterEmail
    });

    return {
      output: {
        taskId: task.id,
        localTaskId: task.local_task_id,
        status: task.status,
        updatedAt: task.updated_at
      },
      message: `Updated task **#${task.local_task_id}** (ID: ${task.id}) — status: ${task.status}.`
    };
  })
  .build();
