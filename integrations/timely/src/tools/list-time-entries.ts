import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let durationSchema = z
  .object({
    hours: z.number(),
    minutes: z.number(),
    seconds: z.number(),
    formatted: z.string(),
    totalHours: z.number(),
    totalSeconds: z.number(),
    totalMinutes: z.number()
  })
  .optional();

let costSchema = z
  .object({
    fractional: z.number(),
    formatted: z.string(),
    amount: z.number()
  })
  .optional();

let timeEntrySchema = z.object({
  eventId: z.number().describe('Time entry ID'),
  day: z.string().describe('Date of the entry (YYYY-MM-DD)'),
  note: z.string().nullable().describe('Notes for the entry'),
  duration: durationSchema.describe('Logged duration'),
  estimatedDuration: durationSchema.describe('Estimated duration'),
  cost: costSchema.describe('Cost of the entry'),
  projectId: z.number().nullable().describe('Associated project ID'),
  projectName: z.string().nullable().describe('Associated project name'),
  userId: z.number().nullable().describe('User who logged the entry'),
  userName: z.string().nullable().describe('Name of the user'),
  labelIds: z.array(z.number()).describe('Label IDs attached'),
  billed: z.boolean().describe('Whether the entry is billed'),
  billable: z.boolean().describe('Whether the entry is billable'),
  timerState: z.string().nullable().describe('Timer state (default, started, paused)'),
  from: z.string().nullable().describe('Start time'),
  to: z.string().nullable().describe('End time'),
  locked: z.boolean().describe('Whether the entry is locked'),
  updatedAt: z.number().nullable().describe('Last updated timestamp')
});

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Retrieve time entries (events) from Timely. Filter by date range, specific date, user, or project. Supports pagination for large result sets.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      since: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      upto: z
        .string()
        .optional()
        .describe('End date filter (YYYY-MM-DD). Required if since is provided'),
      day: z
        .string()
        .optional()
        .describe('Specific date filter (YYYY-MM-DD). Overrides since/upto'),
      userId: z.string().optional().describe('Filter entries by user ID'),
      projectId: z.string().optional().describe('Filter entries by project ID'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Results per page (default: 100)'),
      sort: z.enum(['updated_at', 'id', 'day']).optional().describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      entries: z.array(timeEntrySchema),
      count: z.number().describe('Number of entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let events = await client.listEvents({
      since: ctx.input.since,
      upto: ctx.input.upto,
      day: ctx.input.day,
      userId: ctx.input.userId,
      projectId: ctx.input.projectId,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      order: ctx.input.order
    });

    let entries = events.map((e: any) => ({
      eventId: e.id,
      day: e.day,
      note: e.note ?? null,
      duration: e.duration
        ? {
            hours: e.duration.hours,
            minutes: e.duration.minutes,
            seconds: e.duration.seconds,
            formatted: e.duration.formatted,
            totalHours: e.duration.total_hours,
            totalSeconds: e.duration.total_seconds,
            totalMinutes: e.duration.total_minutes
          }
        : undefined,
      estimatedDuration: e.estimated_duration
        ? {
            hours: e.estimated_duration.hours,
            minutes: e.estimated_duration.minutes,
            seconds: e.estimated_duration.seconds,
            formatted: e.estimated_duration.formatted,
            totalHours: e.estimated_duration.total_hours,
            totalSeconds: e.estimated_duration.total_seconds,
            totalMinutes: e.estimated_duration.total_minutes
          }
        : undefined,
      cost: e.cost
        ? {
            fractional: e.cost.fractional,
            formatted: e.cost.formatted,
            amount: e.cost.amount
          }
        : undefined,
      projectId: e.project?.id ?? null,
      projectName: e.project?.name ?? null,
      userId: e.user?.id ?? null,
      userName: e.user?.name ?? null,
      labelIds: e.label_ids ?? [],
      billed: e.billed ?? false,
      billable: e.billable ?? true,
      timerState: e.timer_state ?? null,
      from: e.from ?? null,
      to: e.to ?? null,
      locked: e.locked ?? false,
      updatedAt: e.updated_at ?? null
    }));

    return {
      output: { entries, count: entries.length },
      message: `Found **${entries.length}** time entries.`
    };
  })
  .build();
