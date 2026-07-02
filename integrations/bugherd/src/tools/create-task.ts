import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task (bug/feedback) in a BugHerd project. Supports setting priority, status, assignee, requester, tags, and an external tracking ID.`,
  instructions: [
    'Priority values: "not set", "critical", "important", "normal", "minor".',
    'Status values: "backlog", "todo", "doing", "done", "closed", or a custom column name. Omit for Feedback.',
    'You can specify the assignee and requester by either user ID or email address.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID to create the task in'),
      description: z.string().describe('Task description'),
      priority: z
        .enum(['not set', 'critical', 'important', 'normal', 'minor'])
        .optional()
        .describe('Task priority'),
      status: z
        .string()
        .optional()
        .describe(
          'Task status (e.g., "backlog", "todo", "doing", "done", "closed", or a custom column name)'
        ),
      assignedToId: z.number().optional().describe('User ID to assign the task to'),
      assignedToEmail: z
        .string()
        .optional()
        .describe('Email of the assignee (must be a project member)'),
      requesterId: z.number().optional().describe('User ID of the requester'),
      requesterEmail: z.string().optional().describe('Email of the requester'),
      tagNames: z.array(z.string()).optional().describe('Tags to apply to the task'),
      externalId: z
        .string()
        .optional()
        .describe('External tracking ID for cross-system integration')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Global task ID'),
      localTaskId: z.number().describe('Project-scoped task ID'),
      projectId: z.number().describe('Project ID'),
      status: z.string().describe('Task status'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let task = await client.createTask(ctx.input.projectId, {
      description: ctx.input.description,
      priority: ctx.input.priority,
      status: ctx.input.status,
      assignedToId: ctx.input.assignedToId,
      assignedToEmail: ctx.input.assignedToEmail,
      requesterId: ctx.input.requesterId,
      requesterEmail: ctx.input.requesterEmail,
      tagNames: ctx.input.tagNames,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        taskId: task.id,
        localTaskId: task.local_task_id,
        projectId: task.project_id,
        status: task.status,
        createdAt: task.created_at
      },
      message: `Created task **#${task.local_task_id}** (ID: ${task.id}) in project ${task.project_id}.`
    };
  })
  .build();
