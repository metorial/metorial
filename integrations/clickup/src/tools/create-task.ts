import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a ClickUp list. Supports setting the name, description, status, priority, assignees, dates, time estimates, tags, custom fields, and parent task (for subtasks).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('The List ID where the task will be created'),
      name: z.string().describe('Task name'),
      description: z.string().optional().describe('Task description (supports markdown)'),
      status: z
        .string()
        .optional()
        .describe('Status name (must match an existing status in the list)'),
      priority: z
        .number()
        .optional()
        .describe(
          'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low). Omit or null for no priority.'
        ),
      assignees: z.array(z.number()).optional().describe('Array of user IDs to assign'),
      tags: z.array(z.string()).optional().describe('Array of tag names to apply'),
      dueDate: z.string().optional().describe('Due date as Unix timestamp in milliseconds'),
      dueDateTime: z.boolean().optional().describe('Whether the due date includes time'),
      startDate: z
        .string()
        .optional()
        .describe('Start date as Unix timestamp in milliseconds'),
      startDateTime: z.boolean().optional().describe('Whether the start date includes time'),
      timeEstimate: z.number().optional().describe('Time estimate in milliseconds'),
      parentTaskId: z
        .string()
        .optional()
        .describe('Parent task ID to create this as a subtask'),
      notifyAll: z.boolean().optional().describe('Notify all assignees on creation'),
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

    let task = await client.createTask(ctx.input.listId, {
      name: ctx.input.name,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      assignees: ctx.input.assignees,
      tags: ctx.input.tags,
      dueDate: ctx.input.dueDate ? Number(ctx.input.dueDate) : undefined,
      dueDateTime: ctx.input.dueDateTime,
      startDate: ctx.input.startDate ? Number(ctx.input.startDate) : undefined,
      startDatetime: ctx.input.startDateTime,
      timeEstimate: ctx.input.timeEstimate,
      parent: ctx.input.parentTaskId,
      notifyAll: ctx.input.notifyAll,
      customFields: ctx.input.customFields?.map(cf => ({ id: cf.fieldId, value: cf.value }))
    });

    return {
      output: {
        taskId: task.id,
        taskName: task.name,
        taskUrl: task.url,
        status: task.status?.status
      },
      message: `Created task **${task.name}** in list ${ctx.input.listId}.`
    };
  })
  .build();
