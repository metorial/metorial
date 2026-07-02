import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTimeEntry = SlateTrigger.create(spec, {
  name: 'New Time Entry',
  key: 'new_time_entry',
  description:
    'Triggers when a new time entry is created or an existing entry is modified in TimeCamp.'
})
  .input(
    z.object({
      entryId: z.string().describe('Time entry ID'),
      userId: z.string().describe('User ID who logged the entry'),
      userName: z.string().describe('User display name'),
      taskId: z.string().describe('Associated task ID'),
      taskName: z.string().describe('Task name'),
      date: z.string().describe('Entry date'),
      duration: z.string().describe('Duration in seconds'),
      startTime: z.string().describe('Start time'),
      endTime: z.string().describe('End time'),
      billable: z.string().describe('Billable status'),
      description: z.string().describe('Entry description'),
      lastModified: z.string().describe('Last modification timestamp')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('Time entry ID'),
      userId: z.string().describe('User ID who logged the entry'),
      userName: z.string().describe('User display name'),
      taskId: z.string().describe('Associated task ID'),
      taskName: z.string().describe('Task name'),
      date: z.string().describe('Entry date (YYYY-MM-DD)'),
      duration: z.string().describe('Duration in seconds'),
      startTime: z.string().describe('Start time (HH:MM:SS)'),
      endTime: z.string().describe('End time (HH:MM:SS)'),
      billable: z.string().describe('Whether billable (0 or 1)'),
      description: z.string().describe('Entry description/note'),
      lastModified: z.string().describe('Last modification timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolled = (ctx.state as any)?.lastPolled as string | undefined;

      let now = new Date();
      let today = now.toISOString().split('T')[0];

      // On first poll, look back 1 day. On subsequent polls, look from the last polled date.
      let fromDate = lastPolled || today;

      let entries = await client.getTimeEntries({
        from: fromDate,
        to: today
      });

      let knownIds = ((ctx.state as any)?.knownIds || []) as string[];
      let knownSet = new Set(knownIds);

      // Filter to only entries that are new or modified since last poll
      let newEntries = (entries || []).filter(e => {
        if (!knownSet.has(String(e.id))) {
          return true;
        }
        // Check if modified after last poll time
        if (lastPolled && e.last_modify && e.last_modify > lastPolled) {
          return true;
        }
        return false;
      });

      let allIds = (entries || []).map(e => String(e.id));

      return {
        inputs: newEntries.map(e => ({
          entryId: String(e.id),
          userId: String(e.user_id),
          userName: e.user_name || '',
          taskId: String(e.task_id),
          taskName: e.name || '',
          date: e.date || '',
          duration: String(e.duration),
          startTime: e.start_time || '',
          endTime: e.end_time || '',
          billable: String(e.billable || '0'),
          description: e.description || '',
          lastModified: e.last_modify || ''
        })),
        updatedState: {
          lastPolled: now.toISOString().replace('T', ' ').substring(0, 19),
          knownIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'time_entry.created',
        id: ctx.input.entryId,
        output: {
          entryId: ctx.input.entryId,
          userId: ctx.input.userId,
          userName: ctx.input.userName,
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          date: ctx.input.date,
          duration: ctx.input.duration,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          billable: ctx.input.billable,
          description: ctx.input.description,
          lastModified: ctx.input.lastModified
        }
      };
    }
  })
  .build();
