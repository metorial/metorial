import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Retrieve time entries from Teamwork. Can filter by project, task, date range, and user. Returns logged hours, descriptions, and billable status.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter by project ID'),
      taskId: z.string().optional().describe('Filter by task ID'),
      userId: z.string().optional().describe('Filter by user/person ID'),
      fromDate: z.string().optional().describe('Start of date range (YYYYMMDD)'),
      toDate: z.string().optional().describe('End of date range (YYYYMMDD)'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(
          z.object({
            timeEntryId: z.string().describe('Time entry ID'),
            projectId: z.string().optional().describe('Associated project ID'),
            taskId: z.string().optional().describe('Associated task ID'),
            personId: z.string().optional().describe('Person who logged the time'),
            personName: z.string().optional().describe('Name of the person'),
            date: z.string().optional().describe('Date of the time entry'),
            hours: z.string().optional().describe('Hours logged'),
            minutes: z.string().optional().describe('Minutes logged'),
            description: z.string().optional().describe('Work description'),
            isBillable: z.boolean().optional().describe('Whether the entry is billable')
          })
        )
        .describe('List of time entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTimeEntries({
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      userId: ctx.input.userId,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let entries = (result['time-entries'] || result.timeEntries || []).map((e: any) => ({
      timeEntryId: String(e.id),
      projectId: e['project-id']
        ? String(e['project-id'])
        : e.projectId
          ? String(e.projectId)
          : undefined,
      taskId: e['todo-item-id']
        ? String(e['todo-item-id'])
        : e.taskId
          ? String(e.taskId)
          : undefined,
      personId: e['person-id']
        ? String(e['person-id'])
        : e.personId
          ? String(e.personId)
          : undefined,
      personName: e['person-first-name']
        ? `${e['person-first-name']} ${e['person-last-name'] || ''}`.trim()
        : undefined,
      date: e.date || undefined,
      hours: e.hours != null ? String(e.hours) : undefined,
      minutes: e.minutes != null ? String(e.minutes) : undefined,
      description: e.description || undefined,
      isBillable:
        e.isbillable === '1' || e.isbillable === true || e.isBillable === true || undefined
    }));

    return {
      output: { timeEntries: entries },
      message: `Found **${entries.length}** time entry/entries.`
    };
  })
  .build();
