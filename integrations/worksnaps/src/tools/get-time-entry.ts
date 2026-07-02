import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntry = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description: `Retrieve a specific time entry by ID, including its screenshot thumbnail URL, activity metrics, and task association. Optionally retrieve the full-resolution screenshot URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project'),
      timeEntryId: z.string().describe('The ID of the time entry to retrieve'),
      fullResolutionUrl: z
        .boolean()
        .optional()
        .describe('Include full-resolution screenshot URL instead of thumbnail')
    })
  )
  .output(
    z.object({
      timeEntry: z.record(z.string(), z.unknown()).describe('Time entry details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let timeEntry = await client.getTimeEntry(
      ctx.input.projectId,
      ctx.input.timeEntryId,
      ctx.input.fullResolutionUrl
    );

    return {
      output: { timeEntry },
      message: `Retrieved time entry **${ctx.input.timeEntryId}**.`
    };
  })
  .build();
