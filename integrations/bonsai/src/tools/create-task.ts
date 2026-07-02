import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Bonsai. Tasks can be assigned to projects, team members, given priorities, due dates, time estimates, and billing types.`,
  instructions: [
    'A **title** is required to create a task.',
    'Link the task to a project by providing a **projectId**.',
    'Assign the task to a team member by providing their **email** via assigneeEmail.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the task'),
      projectId: z.string().optional().describe('ID of the project this task belongs to'),
      description: z.string().optional().describe('Detailed description of the task'),
      assigneeEmail: z
        .string()
        .optional()
        .describe('Email of the team member to assign the task to'),
      priority: z
        .string()
        .optional()
        .describe('Task priority (e.g., "low", "medium", "high")'),
      status: z
        .string()
        .optional()
        .describe('Task status (e.g., "todo", "in_progress", "done")'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for the task (ISO 8601 format, e.g., "2025-01-15")'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date for the task (ISO 8601 format, e.g., "2025-01-31")'),
      timeEstimate: z.number().optional().describe('Estimated time for the task in hours'),
      billingType: z
        .string()
        .optional()
        .describe('Billing type for the task (e.g., "billable", "non_billable")'),
      tags: z.array(z.string()).optional().describe('Tags to categorize the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      title: z.string().describe('Title of the task'),
      projectId: z.string().optional().describe('ID of the linked project'),
      description: z.string().optional().describe('Task description'),
      assigneeEmail: z.string().optional().describe('Assignee email'),
      priority: z.string().optional().describe('Task priority'),
      status: z.string().optional().describe('Task status'),
      startDate: z.string().optional().describe('Start date'),
      dueDate: z.string().optional().describe('Due date'),
      timeEstimate: z.number().optional().describe('Time estimate in hours'),
      billingType: z.string().optional().describe('Billing type'),
      tags: z.array(z.string()).optional().describe('Tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTask({
      title: ctx.input.title,
      projectId: ctx.input.projectId,
      description: ctx.input.description,
      assigneeEmail: ctx.input.assigneeEmail,
      priority: ctx.input.priority,
      status: ctx.input.status,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      timeEstimate: ctx.input.timeEstimate,
      billingType: ctx.input.billingType,
      tags: ctx.input.tags
    });

    return {
      output: {
        taskId: result.id,
        title: result.title,
        projectId: result.projectId,
        description: result.description,
        assigneeEmail: result.assigneeEmail,
        priority: result.priority,
        status: result.status,
        startDate: result.startDate,
        dueDate: result.dueDate,
        timeEstimate: result.timeEstimate,
        billingType: result.billingType,
        tags: result.tags
      },
      message: `Created task **${result.title}** (\`${result.id}\`)${result.projectId ? ` in project \`${result.projectId}\`` : ''}${result.assigneeEmail ? ` assigned to ${result.assigneeEmail}` : ''}.`
    };
  })
  .build();
