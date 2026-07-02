import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing ClickUp task. Modify its name, description, status, priority, assignees, dates, time estimate, and more. Also supports adding/removing tags and setting custom field values in a single call.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to update'),
      name: z.string().optional().describe('New task name'),
      description: z.string().optional().describe('New task description (supports markdown)'),
      status: z.string().optional().describe('New status name'),
      priority: z
        .number()
        .optional()
        .describe(
          'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low). Set to null to clear.'
        ),
      addAssignees: z.array(z.number()).optional().describe('User IDs to add as assignees'),
      removeAssignees: z
        .array(z.number())
        .optional()
        .describe('User IDs to remove from assignees'),
      dueDate: z.string().optional().describe('Due date as Unix timestamp in milliseconds'),
      dueDateTime: z.boolean().optional().describe('Whether the due date includes time'),
      startDate: z
        .string()
        .optional()
        .describe('Start date as Unix timestamp in milliseconds'),
      startDateTime: z.boolean().optional().describe('Whether the start date includes time'),
      timeEstimate: z.number().optional().describe('Time estimate in milliseconds'),
      archived: z.boolean().optional().describe('Archive or unarchive the task'),
      parentTaskId: z.string().optional().describe('Move task to be a subtask of this parent'),
      addTags: z.array(z.string()).optional().describe('Tag names to add to the task'),
      removeTags: z.array(z.string()).optional().describe('Tag names to remove from the task'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.any().describe('Value for the custom field')
          })
        )
        .optional()
        .describe('Custom field values to set')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      taskName: z.string(),
      taskUrl: z.string(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);

    let assignees: { add?: number[]; rem?: number[] } | undefined;
    if (ctx.input.addAssignees || ctx.input.removeAssignees) {
      assignees = {};
      if (ctx.input.addAssignees) assignees.add = ctx.input.addAssignees;
      if (ctx.input.removeAssignees) assignees.rem = ctx.input.removeAssignees;
    }

    let task = await client.updateTask(ctx.input.taskId, {
      name: ctx.input.name,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      assignees,
      dueDate: ctx.input.dueDate ? Number(ctx.input.dueDate) : undefined,
      dueDateTime: ctx.input.dueDateTime,
      startDate: ctx.input.startDate ? Number(ctx.input.startDate) : undefined,
      startDatetime: ctx.input.startDateTime,
      timeEstimate: ctx.input.timeEstimate,
      archived: ctx.input.archived,
      parent: ctx.input.parentTaskId
    });

    // Handle tag additions
    if (ctx.input.addTags) {
      for (let tag of ctx.input.addTags) {
        await client.addTagToTask(ctx.input.taskId, tag);
      }
    }

    // Handle tag removals
    if (ctx.input.removeTags) {
      for (let tag of ctx.input.removeTags) {
        await client.removeTagFromTask(ctx.input.taskId, tag);
      }
    }

    // Handle custom field updates
    if (ctx.input.customFields) {
      for (let cf of ctx.input.customFields) {
        await client.setCustomFieldValue(ctx.input.taskId, cf.fieldId, cf.value);
      }
    }

    return {
      output: {
        taskId: task.id,
        taskName: task.name,
        taskUrl: task.url,
        status: task.status?.status
      },
      message: `Updated task **${task.name}** (${task.id}).`
    };
  })
  .build();
