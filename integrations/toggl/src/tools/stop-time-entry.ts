import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let stopTimeEntry = SlateTool.create(spec, {
  name: 'Stop Time Entry',
  key: 'stop_time_entry',
  description: `Stop a currently running time entry. If no time entry ID is provided, stops the current running timer automatically.`,
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
      timeEntryId: z
        .string()
        .optional()
        .describe(
          'ID of the running time entry. If omitted, the current running entry is stopped.'
        )
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the stopped time entry'),
      description: z.string().nullable().describe('Description'),
      start: z.string().describe('Start time'),
      stop: z.string().nullable().describe('Stop time'),
      duration: z.number().describe('Total duration in seconds'),
      projectId: z.number().nullable().describe('Associated project ID'),
      tags: z.array(z.string()).describe('Tags applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let entryId = ctx.input.timeEntryId;
    if (!entryId) {
      let current = await client.getCurrentTimeEntry();
      if (!current) {
        throw new Error('No running time entry to stop.');
      }
      entryId = String(current.id);
      wsId = String(current.workspace_id);
    }

    let entry = await client.stopTimeEntry(wsId, entryId);

    return {
      output: {
        timeEntryId: entry.id,
        description: entry.description ?? null,
        start: entry.start,
        stop: entry.stop ?? null,
        duration: entry.duration,
        projectId: entry.project_id ?? null,
        tags: entry.tags ?? []
      },
      message: `Stopped timer${entry.description ? `: **${entry.description}**` : ''} — ${Math.round(entry.duration / 60)} min`
    };
  })
  .build();
