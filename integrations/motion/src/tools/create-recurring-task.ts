import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let createRecurringTask = SlateTool.create(spec, {
  name: 'Create Recurring Task',
  key: 'create_recurring_task',
  description: `Create a recurring task in Motion that repeats on a configurable schedule. Supports setting frequency, duration, ideal scheduling time, priority, and assignee.`,
  instructions: [
    'The `frequency` object defines the recurrence pattern. Its structure depends on the Motion API frequency format.',
    'The `idealTime` should be in HH:mm format (24-hour).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Title of the recurring task'),
      workspaceId: z.string().describe('ID of the workspace'),
      assigneeId: z.string().describe('User ID to assign the recurring task to'),
      frequency: z
        .record(z.string(), z.unknown())
        .describe('Recurrence frequency configuration object'),
      deadlineType: z
        .enum(['HARD', 'SOFT'])
        .optional()
        .describe('Deadline type. Defaults to SOFT.'),
      duration: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Duration in minutes (integer > 0) or "REMINDER"'),
      startingOn: z
        .string()
        .optional()
        .describe('ISO 8601 date for when the recurrence begins'),
      idealTime: z.string().optional().describe('Preferred scheduling time in HH:mm format'),
      schedule: z
        .string()
        .optional()
        .describe('Schedule name for when the task can be placed. Defaults to "Work Hours".'),
      description: z.string().optional().describe('Task description'),
      priority: z
        .enum(['HIGH', 'MEDIUM'])
        .optional()
        .describe('Priority level. Defaults to MEDIUM.')
    })
  )
  .output(
    z.object({
      recurringTaskId: z.string().describe('ID of the created recurring task'),
      name: z.string().describe('Title of the recurring task'),
      description: z.string().optional().describe('HTML description'),
      priority: z.string().optional().describe('Priority level'),
      status: z.any().optional().describe('Task status'),
      assignee: z.any().optional().describe('Assigned user details'),
      creator: z.any().optional().describe('Creator details'),
      workspace: z.any().optional().describe('Workspace details'),
      labels: z.array(z.any()).optional().describe('Labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let task = await client.createRecurringTask({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      assigneeId: ctx.input.assigneeId,
      frequency: ctx.input.frequency,
      deadlineType: ctx.input.deadlineType,
      duration: ctx.input.duration,
      startingOn: ctx.input.startingOn,
      idealTime: ctx.input.idealTime,
      schedule: ctx.input.schedule,
      description: ctx.input.description,
      priority: ctx.input.priority
    });

    return {
      output: {
        recurringTaskId: task.id,
        name: task.name,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee,
        creator: task.creator,
        workspace: task.workspace,
        labels: task.labels
      },
      message: `Created recurring task **${task.name}**`
    };
  })
  .build();
