import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalendarEntries = SlateTool.create(spec, {
  name: 'List Calendar Entries',
  key: 'list_calendar_entries',
  description: `List calendar events and tasks in Pipeline CRM. Returns paginated results with optional sorting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 200, max: 200)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., "start_time", "due_date", "created_at")')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            calendarEntryId: z.number().describe('Unique entry ID'),
            name: z.string().nullable().optional().describe('Entry title'),
            type: z
              .string()
              .nullable()
              .optional()
              .describe('Entry type (CalendarEvent or CalendarTask)'),
            description: z.string().nullable().optional().describe('Description'),
            startTime: z.string().nullable().optional().describe('Start time'),
            endTime: z.string().nullable().optional().describe('End time'),
            allDay: z.boolean().nullable().optional().describe('Whether it is all-day'),
            dueDate: z.string().nullable().optional().describe('Due date'),
            complete: z
              .boolean()
              .nullable()
              .optional()
              .describe('Whether the task is complete'),
            createdAt: z.string().nullable().optional().describe('Creation timestamp'),
            updatedAt: z.string().nullable().optional().describe('Last update timestamp')
          })
        )
        .describe('List of calendar entries'),
      totalCount: z.number().describe('Total number of entries'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let result = await client.listCalendarEntries({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let entries = (result.entries ?? []).map((entry: any) => ({
      calendarEntryId: entry.id,
      name: entry.name ?? null,
      type: entry.type ?? null,
      description: entry.description ?? null,
      startTime: entry.start_time ?? null,
      endTime: entry.end_time ?? null,
      allDay: entry.all_day ?? null,
      dueDate: entry.due_date ?? null,
      complete: entry.complete ?? null,
      createdAt: entry.created_at ?? null,
      updatedAt: entry.updated_at ?? null
    }));

    return {
      output: {
        entries,
        totalCount: result.pagination?.total ?? entries.length,
        currentPage: result.pagination?.page ?? 1,
        totalPages: result.pagination?.pages ?? 1
      },
      message: `Found **${result.pagination?.total ?? entries.length}** calendar entries (page ${result.pagination?.page ?? 1} of ${result.pagination?.pages ?? 1})`
    };
  })
  .build();
