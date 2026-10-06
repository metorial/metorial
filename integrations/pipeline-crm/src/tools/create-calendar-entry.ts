import { createApiServiceError, SlateTool } from 'slates';
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
      startTime: z
        .string()
        .optional()
        .describe('Start time for events (YYYY-MM-DD HH:MM:SS in your time zone)'),
      endTime: z
        .string()
        .optional()
        .describe('End time for events (YYYY-MM-DD HH:MM:SS in your time zone)'),
      allDay: z.boolean().optional().describe('Whether this is an all-day event'),
      dueDate: z.string().optional().describe('Due date for tasks (YYYY-MM-DD)'),
      categoryId: z
        .number()
        .optional()
        .describe(
          'Required event/task category ID. Call list_event_categories to discover IDs.'
        ),
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
    if (ctx.input.categoryId === undefined) {
      throw createApiServiceError(
        'Provide categoryId. Call list_event_categories to find an event/task category.'
      );
    }
    if (ctx.input.type === 'CalendarEvent' && (!ctx.input.startTime || !ctx.input.endTime)) {
      throw createApiServiceError('Calendar events require both startTime and endTime.');
    }
    if (
      (ctx.input.associationId === undefined) !==
      (ctx.input.associationType === undefined)
    ) {
      throw createApiServiceError('Provide associationId and associationType together.');
    }
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
