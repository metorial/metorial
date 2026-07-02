import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
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
              .describe('ID of the job item this time is logged against'),
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

    let results: any[];

    if (ctx.input.entries.length === 1) {
      let entry = ctx.input.entries[0]!;
      let body: Record<string, any> = {};
      if (entry.jobItemId !== undefined) body.jobItemId = entry.jobItemId;
      if (entry.userId !== undefined) body.userId = entry.userId;
      if (entry.minutes !== undefined) body.minutes = entry.minutes;
      if (entry.hours !== undefined) body.hours = entry.hours;
      if (entry.date !== undefined) body.date = entry.date;
      if (entry.notes !== undefined) body.notes = entry.notes;

      let result = await client.createLoggedTime(body);
      results = [result];
    } else {
      let bodies = ctx.input.entries.map(entry => {
        let body: Record<string, any> = {};
        if (entry.jobItemId !== undefined) body.jobItemId = entry.jobItemId;
        if (entry.userId !== undefined) body.userId = entry.userId;
        if (entry.minutes !== undefined) body.minutes = entry.minutes;
        if (entry.hours !== undefined) body.hours = entry.hours;
        if (entry.date !== undefined) body.date = entry.date;
        if (entry.notes !== undefined) body.notes = entry.notes;
        return body;
      });
      let result = await client.createLoggedTimesBulk(bodies);
      results = Array.isArray(result) ? result : [result];
    }

    return {
      output: {
        timeEntries: results
      },
      message: `Logged **${results.length}** time entr${results.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
