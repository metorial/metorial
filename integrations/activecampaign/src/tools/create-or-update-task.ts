import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateTask = SlateTool.create(spec, {
  name: 'Create or Update Task',
  key: 'create_or_update_task',
  description: `Creates a new task or updates an existing one. Tasks are typically associated with deals. Supports setting title, due date, task type, assignee, and status.`,
  instructions: [
    'Task status: 0 = incomplete, 1 = complete.',
    'The relType is typically "deal" for deal tasks.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z
        .string()
        .optional()
        .describe('ID of the task to update (omit to create a new task)'),
      title: z.string().optional().describe('Title of the task'),
      relType: z.string().optional().describe('Related resource type, typically "deal"'),
      relId: z.string().optional().describe('ID of the related deal'),
      duedate: z
        .string()
        .optional()
        .describe('Due date in ISO 8601 format (e.g., "2024-12-31T17:00:00-06:00")'),
      taskTypeId: z.string().optional().describe('ID of the task type'),
      note: z.string().optional().describe('Note content for the task'),
      assigneeId: z.string().optional().describe('User ID of the task assignee'),
      status: z.number().optional().describe('Task status: 0=incomplete, 1=complete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      title: z.string().optional(),
      duedate: z.string().optional(),
      status: z.string().optional(),
      relType: z.string().optional(),
      relId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let taskInput = {
      title: ctx.input.title,
      relType: ctx.input.relType,
      relId: ctx.input.relId,
      duedate: ctx.input.duedate,
      dealTasktype: ctx.input.taskTypeId,
      note: ctx.input.note,
      ownerId: ctx.input.assigneeId,
      status: ctx.input.status
    };

    let result: any;
    if (ctx.input.taskId) {
      result = await client.updateTask(ctx.input.taskId, taskInput);
    } else {
      result = await client.createTask(taskInput);
    }

    let task = result.dealTask;

    return {
      output: {
        taskId: task.id,
        title: task.title || undefined,
        duedate: task.duedate || undefined,
        status: task.status !== undefined ? String(task.status) : undefined,
        relType: task.reltype || undefined,
        relId: task.relid || undefined
      },
      message: ctx.input.taskId
        ? `Task **${task.title || task.id}** updated.`
        : `Task **${task.title || task.id}** created.`
    };
  })
  .build();
