import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCalendarEntry = SlateTool.create(spec, {
  name: 'Create Calendar Entry',
  key: 'create_calendar_entry',
  description: `Create a calendar event or task in Pipeline CRM. Events have start/end times, while tasks have due dates. Entries can be associated with a deal, person, or company.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Title of the calendar entry'),
      description: z.string().optional().describe('Description of the entry'),
      type: z
        .enum(['CalendarEvent', 'CalendarTask'])
        .optional()
        .describe('Entry type: CalendarEvent or CalendarTask'),
      startTime: z.string().optional().describe('Start time for events (ISO 8601)'),
      endTime: z.string().optional().describe('End time for events (ISO 8601)'),
      allDay: z.boolean().optional().describe('Whether this is an all-day event'),
      dueDate: z.string().optional().describe('Due date for tasks (YYYY-MM-DD)'),
      categoryId: z.number().optional().describe('Event/task category ID'),
      associationId: z
        .number()
        .optional()
        .describe('Associated record ID (deal, person, or company)'),
      associationType: z
        .string()
        .optional()
        .describe('Type of associated record (e.g., "Deal", "Person", "Company")')
    })
  )
  .output(
    z.object({
      calendarEntryId: z.number().describe('ID of the created calendar entry'),
      name: z.string().describe('Title'),
      type: z.string().nullable().optional().describe('Entry type'),
      startTime: z.string().nullable().optional().describe('Start time'),
      endTime: z.string().nullable().optional().describe('End time'),
      dueDate: z.string().nullable().optional().describe('Due date'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let entryData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description !== undefined) entryData.description = ctx.input.description;
    if (ctx.input.type !== undefined) entryData.type = ctx.input.type;
    if (ctx.input.startTime !== undefined) entryData.start_time = ctx.input.startTime;
    if (ctx.input.endTime !== undefined) entryData.end_time = ctx.input.endTime;
    if (ctx.input.allDay !== undefined) entryData.all_day = ctx.input.allDay;
    if (ctx.input.dueDate !== undefined) entryData.due_date = ctx.input.dueDate;
    if (ctx.input.categoryId !== undefined) entryData.category_id = ctx.input.categoryId;
    if (ctx.input.associationId !== undefined)
      entryData.association_id = ctx.input.associationId;
    if (ctx.input.associationType !== undefined)
      entryData.association_type = ctx.input.associationType;

    let entry = await client.createCalendarEntry(entryData);

    return {
      output: {
        calendarEntryId: entry.id,
        name: entry.name,
        type: entry.type ?? null,
        startTime: entry.start_time ?? null,
        endTime: entry.end_time ?? null,
        dueDate: entry.due_date ?? null,
        createdAt: entry.created_at ?? null
      },
      message: `Created calendar entry **${entry.name}**${entry.type ? ` (${entry.type})` : ''}`
    };
  })
  .build();
