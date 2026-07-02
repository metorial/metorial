import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskSchema } from '../lib/types';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Updates an existing task's properties including title, description, status, priority, assignees, dates, tags, custom properties, and task relationships (blockers, subtasks, duplicates, related). Only provide the fields you want to change.`,
  instructions: [
    'Only include the fields you want to update — omitted fields remain unchanged.',
    'Set a field to null to clear it (e.g., assignee: null to unassign).',
    'Task relationships replace existing values — include all desired IDs when updating.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      title: z.string().optional().describe('New task title'),
      dartboard: z.string().optional().describe('Move to a different dartboard (by name)'),
      description: z.string().optional().describe('Updated description in markdown'),
      status: z.string().optional().describe('New status name'),
      type: z.string().optional().describe('New task type name'),
      assignee: z
        .string()
        .nullable()
        .optional()
        .describe('New assignee name or email, or null to unassign'),
      assignees: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('New assignee list, or null to clear'),
      priority: z
        .enum(['Critical', 'High', 'Medium', 'Low'])
        .nullable()
        .optional()
        .describe('New priority, or null to clear'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
      startAt: z
        .string()
        .nullable()
        .optional()
        .describe('Start date (YYYY-MM-DD), or null to clear'),
      dueAt: z
        .string()
        .nullable()
        .optional()
        .describe('Due date (YYYY-MM-DD), or null to clear'),
      size: z
        .union([z.string(), z.number()])
        .nullable()
        .optional()
        .describe('Size/estimate, or null to clear'),
      parentId: z
        .string()
        .nullable()
        .optional()
        .describe('Parent task ID, or null to remove from parent'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom property values keyed by property name'),
      taskRelationships: z
        .object({
          subtaskIds: z.array(z.string()).optional().describe('Subtask IDs'),
          blockerIds: z.array(z.string()).optional().describe('Blocker task IDs'),
          blockingIds: z.array(z.string()).optional().describe('Tasks this task blocks'),
          duplicateIds: z.array(z.string()).optional().describe('Duplicate task IDs'),
          relatedIds: z.array(z.string()).optional().describe('Related task IDs')
        })
        .optional()
        .describe('Task relationships to set')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { taskId, ...updateParams } = ctx.input;
    let task = await client.updateTask(taskId, updateParams);

    return {
      output: task,
      message: `Updated task **${task.title}** (${task.status}). [View task](${task.htmlUrl})`
    };
  })
  .build();
