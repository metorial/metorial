import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskSchema } from '../lib/types';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Creates a new task in a Dart dartboard. Supports setting title, description, assignee, priority, dates, tags, and custom properties. Use **Get Workspace Config** first to discover available dartboards, statuses, assignees, and other options.`,
  instructions: [
    'The dartboard field expects the dartboard title (name), not an ID.',
    'Assignee and assignees fields accept names or email addresses.',
    'Priority must be one of: Critical, High, Medium, Low.',
    'Dates should be in YYYY-MM-DD format.',
    'Custom properties are keyed by property name, not ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Task title'),
      dartboard: z
        .string()
        .optional()
        .describe('Dartboard (project) name to create the task in'),
      description: z.string().optional().describe('Task description in markdown'),
      status: z.string().optional().describe('Initial status name'),
      type: z.string().optional().describe('Task type name'),
      assignee: z.string().optional().describe('Assignee name or email'),
      assignees: z.array(z.string()).optional().describe('Multiple assignee names or emails'),
      priority: z
        .enum(['Critical', 'High', 'Medium', 'Low'])
        .optional()
        .describe('Priority level'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      startAt: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dueAt: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      size: z.union([z.string(), z.number()]).optional().describe('Size/estimate value'),
      parentId: z.string().optional().describe('Parent task ID to create as subtask'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom property values keyed by property name')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.createTask(ctx.input);

    return {
      output: task,
      message: `Created task **${task.title}** in dartboard **${task.dartboard}** with status **${task.status}**. [View task](${task.htmlUrl})`
    };
  })
  .build();
