import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userRefSchema = z
  .object({
    emailId: z.string().optional().describe('Email address of the user'),
    userId: z.number().optional().describe('User ID')
  })
  .describe('User reference');

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Creates a new task within a Rocketlane project. Tasks can be assigned to a phase, have assignees and followers, set dates and effort, and include custom fields. Subtasks can be created by specifying a parent task ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskName: z.string().describe('Name of the task'),
      projectId: z.number().describe('ID of the project this task belongs to'),
      phaseId: z.number().optional().describe('ID of the phase to place this task in'),
      parentTaskId: z
        .number()
        .optional()
        .describe('ID of the parent task (for creating subtasks)'),
      assignees: z.array(userRefSchema).optional().describe('Users to assign this task to'),
      followers: z.array(userRefSchema).optional().describe('Users to add as followers'),
      startDate: z.string().optional().describe('Task start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Task due date in YYYY-MM-DD format'),
      effort: z.number().optional().describe('Estimated effort in minutes'),
      progress: z.number().optional().describe('Task progress percentage (0-100)'),
      description: z.string().optional().describe('Task description'),
      status: z.string().optional().describe('Task status'),
      priority: z.string().optional().describe('Task priority'),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            fieldValue: z.any().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Unique ID of the created task'),
      taskName: z.string().describe('Task name'),
      projectId: z.number().optional().describe('Project ID'),
      phaseId: z.number().optional().describe('Phase ID'),
      startDate: z.string().nullable().optional().describe('Start date'),
      dueDate: z.string().nullable().optional().describe('Due date'),
      status: z.any().optional().describe('Task status'),
      assignees: z.array(z.any()).optional().describe('Assigned users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTask({
      taskName: ctx.input.taskName,
      projectId: ctx.input.projectId,
      phaseId: ctx.input.phaseId,
      parentTaskId: ctx.input.parentTaskId,
      assignees: ctx.input.assignees,
      followers: ctx.input.followers,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      effort: ctx.input.effort,
      progress: ctx.input.progress,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      fields: ctx.input.fields
    });

    return {
      output: result,
      message: `Task **${result.taskName}** created successfully (ID: ${result.taskId}).`
    };
  })
  .build();
