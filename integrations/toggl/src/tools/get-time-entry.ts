import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntry = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description: `Retrieve a specific time entry by ID, or get the currently running time entry. Use this to check on a running timer or inspect a specific entry's details.`,
  tags: {
    readOnly: true
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
        .describe('ID of the time entry to retrieve. Omit to get the currently running entry.')
    })
  )
  .output(
    z.object({
      timeEntryId: z
        .number()
        .nullable()
        .describe('ID of the time entry, null if no running entry found'),
      description: z.string().nullable().describe('Description of the time entry'),
      start: z.string().nullable().describe('Start time'),
      stop: z.string().nullable().describe('Stop time'),
      duration: z.number().nullable().describe('Duration in seconds (-1 if running)'),
      projectId: z.number().nullable().describe('Associated project ID'),
      taskId: z.number().nullable().describe('Associated task ID'),
      tags: z.array(z.string()).describe('Tags applied to the entry'),
      billable: z.boolean().nullable().describe('Whether the entry is billable'),
      workspaceId: z.number().nullable().describe('Workspace ID'),
      running: z.boolean().describe('Whether the timer is currently running')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);

    let entry: any;
    if (ctx.input.timeEntryId) {
      let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
      entry = await client.getTimeEntry(wsId, ctx.input.timeEntryId);
    } else {
      entry = await client.getCurrentTimeEntry();
    }

    if (!entry) {
      return {
        output: {
          timeEntryId: null,
          description: null,
          start: null,
          stop: null,
          duration: null,
          projectId: null,
          taskId: null,
          tags: [],
          billable: null,
          workspaceId: null,
          running: false
        },
        message: 'No running time entry found.'
      };
    }

    let running = entry.duration < 0;

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
        workspaceId: entry.workspace_id,
        running
      },
      message: running
        ? `Running timer${entry.description ? `: **${entry.description}**` : ''} (started at ${entry.start})`
        : `Time entry${entry.description ? `: **${entry.description}**` : ''} — ${Math.round(entry.duration / 60)} min`
    };
  })
  .build();
