import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCalendarEntry = SlateTool.create(spec, {
  name: 'Update Calendar Entry',
  key: 'update_calendar_entry',
  description:
    'Update a Pipeline CRM task or event, including completing or reopening a task, rescheduling, and changing its associated record. Call list_calendar_entries to discover IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      calendarEntryId: z
        .number()
        .int()
        .positive()
        .describe('Entry ID from list_calendar_entries'),
      name: z.string().optional().describe('Updated title'),
      description: z.string().optional().describe('Updated description'),
      startTime: z
        .string()
        .optional()
        .describe('Event start (YYYY-MM-DD HH:MM:SS in your time zone)'),
      endTime: z
        .string()
        .optional()
        .describe('Event end (YYYY-MM-DD HH:MM:SS in your time zone)'),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe('Task due date (YYYY-MM-DD), or null to remove it'),
      complete: z.boolean().optional().describe('True to complete a task; false to reopen it'),
      allDay: z.boolean().optional().describe('Whether the event is all day'),
      categoryId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Category ID from list_event_categories'),
      associationId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Associated deal, person, or company ID; provide associationType too'),
      associationType: z
        .enum(['Deal', 'Person', 'Company'])
        .optional()
        .describe('Associated record type; provide associationId too')
    })
  )
  .output(
    z.object({
      calendarEntryId: z.number().describe('Updated entry ID'),
      name: z.string().nullable().describe('Entry title'),
      type: z.string().nullable().describe('CalendarTask or CalendarEvent'),
      complete: z.boolean().nullable().describe('Task completion state'),
      startTime: z.string().nullable().describe('Event start'),
      endTime: z.string().nullable().describe('Event end'),
      dueDate: z.string().nullable().describe('Task due date'),
      associationId: z.number().nullable().describe('Associated record ID'),
      associationType: z.string().nullable().describe('Associated record type'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    if (
      (ctx.input.associationId === undefined) !==
      (ctx.input.associationType === undefined)
    ) {
      throw createApiServiceError('Provide associationId and associationType together.');
    }
    let changes = pickDefined({
      name: ctx.input.name,
      description: ctx.input.description,
      start_time: ctx.input.startTime,
      end_time: ctx.input.endTime,
      due_date: ctx.input.dueDate,
      complete: ctx.input.complete,
      all_day: ctx.input.allDay,
      category_id: ctx.input.categoryId,
      association_id: ctx.input.associationId,
      association_type: ctx.input.associationType
    });
    if (Object.keys(changes).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let entry = await new Client(ctx.auth).updateCalendarEntry(
      ctx.input.calendarEntryId,
      changes
    );
    return {
      output: {
        calendarEntryId: entry.id,
        name: entry.name ?? null,
        type: entry.type ?? null,
        complete: entry.complete ?? null,
        startTime: entry.start_time ?? null,
        endTime: entry.end_time ?? null,
        dueDate: entry.due_date ?? null,
        associationId: entry.association_id ?? null,
        associationType: entry.association_type ?? null,
        updatedAt: entry.updated_at ?? null
      },
      message: `Updated calendar entry (ID: **${entry.id}**)`
    };
  })
  .build();
