import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let timeEntryChanges = SlateTrigger.create(spec, {
  name: 'Time Entry Changes',
  key: 'time_entry_changes',
  description:
    'Triggers when time entries are created or updated in Harvest. Polls for changes since the last check.'
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry'),
      updatedAt: z.string().describe('When the entry was last updated'),
      createdAt: z.string().describe('When the entry was created'),
      isNew: z.boolean().describe('Whether this is a newly created entry'),
      entry: z.any().describe('Full time entry data from the API')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry'),
      userId: z.number().optional().describe('User ID'),
      userName: z.string().optional().describe('User name'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      clientName: z.string().optional().describe('Client name'),
      taskId: z.number().optional().describe('Task ID'),
      taskName: z.string().optional().describe('Task name'),
      spentDate: z.string().describe('Date the time was spent'),
      hours: z.number().describe('Hours logged'),
      notes: z.string().nullable().describe('Notes'),
      isRunning: z.boolean().describe('Whether the timer is running'),
      isBilled: z.boolean().describe('Whether billed'),
      billable: z.boolean().describe('Whether billable'),
      createdAt: z.string().describe('Created timestamp'),
      updatedAt: z.string().describe('Updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HarvestClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownIds as number[]) ?? [];

      let params: any = {
        perPage: 100
      };
      if (lastPollTime) {
        params.updatedSince = lastPollTime;
      }

      let result = await client.listTimeEntries(params);
      let entries = result.results;

      // Fetch additional pages if there are more
      let page = 2;
      while (result.nextPage) {
        result = await client.listTimeEntries({ ...params, page });
        entries = entries.concat(result.results);
        page++;
      }

      let newPollTime = new Date().toISOString();

      let inputs = entries.map((entry: any) => ({
        timeEntryId: entry.id,
        updatedAt: entry.updated_at,
        createdAt: entry.created_at,
        isNew: !knownIds.includes(entry.id),
        entry
      }));

      let updatedKnownIds = [
        ...new Set([...knownIds, ...entries.map((e: any) => e.id)])
      ].slice(-10000); // Keep last 10k IDs to prevent unbounded growth

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let entry = ctx.input.entry;
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `time_entry.${eventType}`,
        id: `${entry.id}-${entry.updated_at}`,
        output: {
          timeEntryId: entry.id,
          userId: entry.user?.id,
          userName: entry.user?.name,
          projectId: entry.project?.id,
          projectName: entry.project?.name,
          clientName: entry.client?.name,
          taskId: entry.task?.id,
          taskName: entry.task?.name,
          spentDate: entry.spent_date,
          hours: entry.hours,
          notes: entry.notes,
          isRunning: entry.is_running,
          isBilled: entry.is_billed,
          billable: entry.billable,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at
        }
      };
    }
  })
  .build();
