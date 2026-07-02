import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntries = SlateTool.create(spec, {
  name: 'Get Time Entries',
  key: 'get_time_entries',
  description: `Retrieve time entries for a project, filtered by users and date range. Each time entry represents a 10-minute "work snap" with optional screenshot, activity metrics, and task association. Can also filter by specific tasks or entry type (online/offline).`,
  instructions: [
    'Timestamps must align to 10-minute boundaries (e.g., 1609459200 for a round interval).',
    'Use semicolons to separate multiple user IDs or task IDs (e.g., "123;456;789").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project'),
      userIds: z
        .string()
        .describe('Semicolon-separated user IDs to filter by (e.g., "123;456")'),
      fromTimestamp: z
        .string()
        .describe('Start timestamp (Unix epoch, must align to 10-minute boundary)'),
      toTimestamp: z
        .string()
        .describe('End timestamp (Unix epoch, must align to 10-minute boundary)'),
      taskIds: z.string().optional().describe('Semicolon-separated task IDs to filter by'),
      timeEntryType: z.enum(['online', 'offline']).optional().describe('Filter by entry type')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(z.record(z.string(), z.unknown())).describe('List of time entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let timeEntries = await client.listTimeEntries(ctx.input.projectId, {
      userIds: ctx.input.userIds,
      fromTimestamp: ctx.input.fromTimestamp,
      toTimestamp: ctx.input.toTimestamp,
      taskIds: ctx.input.taskIds,
      timeEntryType: ctx.input.timeEntryType
    });

    return {
      output: { timeEntries },
      message: `Found **${timeEntries.length}** time entry/entries for project **${ctx.input.projectId}**.`
    };
  })
  .build();
