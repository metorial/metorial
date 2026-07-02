import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a new time entry or start a timer in Clockify. Supports manual time entries with start/end times, or starting a running timer by omitting the end time. Can assign entries to projects, tasks, and tags, and set billable status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      start: z
        .string()
        .describe('Start time in ISO 8601 format (e.g., "2024-01-15T09:00:00Z")'),
      end: z
        .string()
        .optional()
        .describe('End time in ISO 8601 format. Omit to start a running timer.'),
      description: z.string().optional().describe('Description of the time entry'),
      projectId: z.string().optional().describe('ID of the project to assign the entry to'),
      taskId: z
        .string()
        .optional()
        .describe('ID of the task to assign the entry to (requires projectId)'),
      tagIds: z
        .array(z.string())
        .optional()
        .describe('Array of tag IDs to apply to the entry'),
      billable: z.boolean().optional().describe('Whether the time entry is billable'),
      type: z.enum(['REGULAR', 'BREAK']).optional().describe('Type of time entry')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('ID of the created time entry'),
      description: z.string().optional().describe('Description of the time entry'),
      projectId: z.string().optional().describe('Project ID'),
      taskId: z.string().optional().describe('Task ID'),
      billable: z.boolean().describe('Whether the entry is billable'),
      start: z.string().describe('Start time'),
      end: z.string().optional().describe('End time'),
      isRunning: z.boolean().describe('Whether the timer is currently running')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let entry = await client.createTimeEntry({
      start: ctx.input.start,
      end: ctx.input.end,
      description: ctx.input.description,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      tagIds: ctx.input.tagIds,
      billable: ctx.input.billable,
      type: ctx.input.type
    });

    let isRunning = !entry.timeInterval?.end;

    return {
      output: {
        timeEntryId: entry.id,
        description: entry.description || undefined,
        projectId: entry.projectId || undefined,
        taskId: entry.taskId || undefined,
        billable: entry.billable ?? false,
        start: entry.timeInterval?.start || ctx.input.start,
        end: entry.timeInterval?.end || undefined,
        isRunning
      },
      message: isRunning
        ? `Started a new timer${entry.description ? ` for "${entry.description}"` : ''}.`
        : `Created time entry${entry.description ? ` "${entry.description}"` : ''} from ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();
