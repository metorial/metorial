import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Magnetic. Tasks can be assigned to a user, linked to an opportunity/job, and configured with dates, time estimates, and billing settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the task'),
      description: z.string().optional().describe('Description of the task'),
      opportunityId: z
        .string()
        .optional()
        .describe('ID of the opportunity/job to link this task to'),
      ownerId: z.string().optional().describe('User ID of the task owner'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether time tracked on this task is billable'),
      timeEstimateMinutes: z
        .number()
        .optional()
        .describe('Estimated time for the task in minutes'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format'),
      dueDate: z.string().optional().describe('Due/end date in ISO 8601 format'),
      tags: z.string().optional().describe('Comma-separated tags for the task'),
      priority: z.string().optional().describe('Priority level of the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      taskName: z.string().optional().describe('Name of the task'),
      taskCode: z.string().optional().describe('Code identifier of the task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      task: ctx.input.name,
      description: ctx.input.description,
      billable: ctx.input.billable,
      effortMinutes: ctx.input.timeEstimateMinutes,
      startDate: ctx.input.startDate,
      endDate: ctx.input.dueDate,
      tags: ctx.input.tags,
      priority: ctx.input.priority
    };

    if (ctx.input.opportunityId) {
      data.grouping = { id: ctx.input.opportunityId };
    }

    if (ctx.input.ownerId) {
      data.user = { id: ctx.input.ownerId };
    }

    let response = await client.createOrUpdateTask(data);

    return {
      output: {
        taskId: String(response.id),
        taskName: response.task,
        taskCode: response.code
      },
      message: `Created task **${response.task || ctx.input.name}** (ID: ${response.id}).`
    };
  })
  .build();
