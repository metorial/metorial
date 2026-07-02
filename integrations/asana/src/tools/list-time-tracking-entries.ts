import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asanaServiceError } from '../lib/errors';
import { spec } from '../spec';

let formatTimeTrackingEntry = (entry: any) => ({
  timeTrackingEntryId: entry.gid,
  durationMinutes: entry.duration_minutes,
  enteredOn: entry.entered_on,
  createdAt: entry.created_at,
  createdBy: entry.created_by,
  task: entry.task
});

export let listTimeTrackingEntries = SlateTool.create(spec, {
  name: 'List Time Tracking Entries',
  key: 'list_time_tracking_entries',
  description: `List Asana time tracking entries for a task, or retrieve one entry by GID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task GID whose time entries should be listed.'),
      timeTrackingEntryId: z
        .string()
        .optional()
        .describe('Specific time tracking entry GID to retrieve.'),
      limit: z.number().optional().describe('Maximum entries to return when listing.')
    })
  )
  .output(
    z.object({
      timeTrackingEntries: z
        .array(
          z.object({
            timeTrackingEntryId: z.string(),
            durationMinutes: z.number().optional(),
            enteredOn: z.string().optional(),
            createdAt: z.string().optional(),
            createdBy: z.any().optional(),
            task: z.any().optional()
          })
        )
        .optional(),
      timeTrackingEntry: z.any().optional(),
      timeTrackingEntryCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.timeTrackingEntryId) {
      let timeTrackingEntry = formatTimeTrackingEntry(
        await client.getTimeTrackingEntry(ctx.input.timeTrackingEntryId)
      );

      return {
        output: { timeTrackingEntry, timeTrackingEntryCount: 1 },
        message: `Retrieved time tracking entry ${timeTrackingEntry.timeTrackingEntryId}.`
      };
    }

    if (!ctx.input.taskId) {
      throw asanaServiceError('taskId is required when timeTrackingEntryId is not provided.');
    }

    let result = await client.listTimeTrackingEntries(ctx.input.taskId, {
      limit: ctx.input.limit
    });
    let timeTrackingEntries = (result.data || []).map(formatTimeTrackingEntry);

    return {
      output: {
        timeTrackingEntries,
        timeTrackingEntryCount: timeTrackingEntries.length
      },
      message: `Found **${timeTrackingEntries.length}** time tracking entr(y/ies).`
    };
  })
  .build();
