import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update an existing time entry's properties such as description, start/stop times, project, task, tags, or billable status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      timeEntryId: z.string().describe('ID of the time entry to update'),
      description: z.string().optional().describe('New description'),
      start: z.string().optional().describe('New start time in ISO 8601 format'),
      stop: z.string().optional().describe('New stop time in ISO 8601 format'),
      duration: z.number().optional().describe('New duration in seconds'),
      projectId: z
        .number()
        .nullable()
        .optional()
        .describe('Project ID to assign (null to remove)'),
      taskId: z.number().nullable().optional().describe('Task ID to assign (null to remove)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tag names to set on the entry (replaces existing tags)'),
      billable: z.boolean().optional().describe('Whether the entry is billable')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the updated time entry'),
      description: z.string().nullable().describe('Description'),
      start: z.string().describe('Start time'),
      stop: z.string().nullable().describe('Stop time'),
      duration: z.number().describe('Duration in seconds'),
      projectId: z.number().nullable().describe('Associated project ID'),
      taskId: z.number().nullable().describe('Associated task ID'),
      tags: z.array(z.string()).describe('Tags applied'),
      billable: z.boolean().describe('Whether billable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let entry = await client.updateTimeEntry(wsId, ctx.input.timeEntryId, {
      description: ctx.input.description,
      start: ctx.input.start,
      stop: ctx.input.stop,
      duration: ctx.input.duration,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      tags: ctx.input.tags,
      billable: ctx.input.billable
    });

    return {
      output: {
        timeEntryId: entry.id,
        description: entry.description ?? null,
        start: entry.start,
        stop: entry.stop ?? null,
        duration: entry.duration,
        projectId: entry.project_id ?? null,
        taskId: entry.task_id ?? null,
        tags: entry.tags ?? [],
        billable: entry.billable ?? false
      },
      message: `Updated time entry **#${entry.id}**${entry.description ? ` (${entry.description})` : ''}`
    };
  })
  .build();
