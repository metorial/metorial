import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a new time entry in Toggl Track. Can create a completed entry with explicit start/stop times, or start a running timer by setting a negative duration (-1). Supports assigning to projects, tasks, and adding tags.`,
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
      description: z.string().optional().describe('Description of the time entry'),
      start: z
        .string()
        .describe('Start time in ISO 8601 format (e.g., "2024-01-15T09:00:00Z")'),
      duration: z.number().describe('Duration in seconds. Use -1 to start a running timer.'),
      stop: z
        .string()
        .optional()
        .describe('Stop time in ISO 8601 format. Required for completed entries.'),
      projectId: z.number().optional().describe('Project ID to assign the time entry to'),
      taskId: z.number().optional().describe('Task ID to assign the time entry to'),
      tags: z.array(z.string()).optional().describe('Tag names to apply to the time entry'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether the time entry is billable (requires paid plan)')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the created time entry'),
      description: z.string().nullable().describe('Description of the time entry'),
      start: z.string().describe('Start time'),
      stop: z.string().nullable().describe('Stop time'),
      duration: z.number().describe('Duration in seconds (-1 if running)'),
      projectId: z.number().nullable().describe('Associated project ID'),
      taskId: z.number().nullable().describe('Associated task ID'),
      tags: z.array(z.string()).describe('Tags applied to the entry'),
      billable: z.boolean().describe('Whether the entry is billable'),
      workspaceId: z.number().describe('Workspace ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let entry = await client.createTimeEntry(wsId, {
      description: ctx.input.description,
      start: ctx.input.start,
      duration: ctx.input.duration,
      stop: ctx.input.stop,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      tags: ctx.input.tags,
      billable: ctx.input.billable,
      createdWith: 'slates'
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
        billable: entry.billable ?? false,
        workspaceId: entry.workspace_id
      },
      message:
        entry.duration < 0
          ? `Started a running timer${entry.description ? `: **${entry.description}**` : ''}`
          : `Created time entry${entry.description ? `: **${entry.description}**` : ''} (${Math.round(entry.duration / 60)} min)`
    };
  })
  .build();
