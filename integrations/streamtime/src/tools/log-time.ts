import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { buildTimeEntryBody } from '../lib/time-entries';
import { spec } from '../spec';

export let logTime = SlateTool.create(spec, {
  name: 'Log Time',
  key: 'log_time',
  description: `Create a new time entry in Streamtime. Time entries are logged against to-do items which are tied to job items. You can log a single entry or provide multiple entries for bulk creation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entries: z
        .array(
          z.object({
            jobItemId: z
              .number()
              .optional()
              .describe(
                'ID of the job item this time is logged against. Its matching user assignment is resolved using userId; otherwise the item must have exactly one assignment.'
              ),
            jobId: z.number().optional().describe('Job ID to associate with the entry'),
            jobItemUserId: z
              .number()
              .optional()
              .describe(
                'User assignment ID. Call get_job_item with includeUsers to discover IDs. Alternative to jobItemId.'
              ),
            userId: z.number().optional().describe('ID of the user who logged the time'),
            minutes: z.number().optional().describe('Number of minutes logged'),
            hours: z
              .number()
              .optional()
              .describe('Number of hours logged (alternative to minutes)'),
            date: z.string().optional().describe('Date of the time entry (YYYY-MM-DD format)'),
            notes: z.string().optional().describe('Description or notes for the time entry')
          })
        )
        .min(1)
        .describe('One or more time entries to create')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(z.record(z.string(), z.any()))
        .describe('The created time entry/entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    // Resolve every entry before creating any, so invalid inputs cannot cause partial writes.
    let bodies: Record<string, unknown>[] = [];
    for (let entry of ctx.input.entries) {
      bodies.push(await buildTimeEntryBody(client, entry));
    }
    let results =
      bodies.length === 1
        ? [await client.createLoggedTime(bodies[0]!)]
        : await client.createLoggedTimesBulk(bodies);

    return {
      output: {
        timeEntries: results
      },
      message: `Logged **${results.length}** time entr${results.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
