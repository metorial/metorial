import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listCalendarEvents = SlateTool.create(spec, {
  name: 'List Calendar Events',
  key: 'list_calendar_events',
  description: `List calendar events for a course or org unit. Returns event titles, dates, descriptions, and associated details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            calendarEventId: z.string().describe('Calendar event ID'),
            title: z.string().optional().describe('Event title'),
            description: z.string().optional().describe('Event description'),
            startDateTime: z.string().optional().describe('Start date/time'),
            endDateTime: z.string().optional().describe('End date/time'),
            isAllDayEvent: z.boolean().optional().describe('Whether this is an all-day event')
          })
        )
        .describe('List of calendar events')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listCalendarEvents(ctx.input.orgUnitId);

    let items = Array.isArray(result) ? result : result?.Objects || [];
    let events = items.map((e: any) => ({
      calendarEventId: String(e.CalendarEventId),
      title: e.Title,
      description: e.Description,
      startDateTime: e.StartDateTime,
      endDateTime: e.EndDateTime,
      isAllDayEvent: e.IsAllDayEvent
    }));

    return {
      output: { events },
      message: `Found **${events.length}** calendar event(s).`
    };
  })
  .build();

export let createCalendarEvent = SlateTool.create(spec, {
  name: 'Create Calendar Event',
  key: 'create_calendar_event',
  description: `Create a new calendar event for a course or org unit. Specify a title, description, and date/time range.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID'),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      startDateTime: z.string().describe('Start date/time (ISO 8601)'),
      endDateTime: z.string().describe('End date/time (ISO 8601)')
    })
  )
  .output(
    z.object({
      calendarEventId: z.string().describe('New calendar event ID'),
      title: z.string().describe('Event title')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let eventData: any = {
      Title: ctx.input.title,
      Description: ctx.input.description || '',
      StartDateTime: ctx.input.startDateTime,
      EndDateTime: ctx.input.endDateTime
    };

    let result = await client.createCalendarEvent(ctx.input.orgUnitId, eventData);

    return {
      output: {
        calendarEventId: String(result.CalendarEventId),
        title: result.Title
      },
      message: `Created calendar event **${result.Title}** (ID: ${result.CalendarEventId}).`
    };
  })
  .build();

export let updateCalendarEvent = SlateTool.create(spec, {
  name: 'Update Calendar Event',
  key: 'update_calendar_event',
  description: `Update an existing calendar event's title, description, or dates.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID'),
      calendarEventId: z.string().describe('Calendar event ID to update'),
      title: z.string().optional().describe('Updated title'),
      description: z.string().optional().describe('Updated description'),
      startDateTime: z.string().optional().describe('Updated start date/time (ISO 8601)'),
      endDateTime: z.string().optional().describe('Updated end date/time (ISO 8601)')
    })
  )
  .output(
    z.object({
      calendarEventId: z.string().describe('Updated event ID'),
      title: z.string().optional().describe('Updated title')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let updateData: any = {};
    if (ctx.input.title !== undefined) updateData.Title = ctx.input.title;
    if (ctx.input.description !== undefined) updateData.Description = ctx.input.description;
    if (ctx.input.startDateTime !== undefined)
      updateData.StartDateTime = ctx.input.startDateTime;
    if (ctx.input.endDateTime !== undefined) updateData.EndDateTime = ctx.input.endDateTime;

    let result = await client.updateCalendarEvent(
      ctx.input.orgUnitId,
      ctx.input.calendarEventId,
      updateData
    );

    return {
      output: {
        calendarEventId: String(result.CalendarEventId),
        title: result.Title
      },
      message: `Updated calendar event **${result.Title}** (ID: ${result.CalendarEventId}).`
    };
  })
  .build();

export let deleteCalendarEvent = SlateTool.create(spec, {
  name: 'Delete Calendar Event',
  key: 'delete_calendar_event',
  description: `Delete a calendar event from a course or org unit.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID'),
      calendarEventId: z.string().describe('Calendar event ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteCalendarEvent(ctx.input.orgUnitId, ctx.input.calendarEventId);

    return {
      output: { success: true },
      message: `Deleted calendar event (ID: ${ctx.input.calendarEventId}).`
    };
  })
  .build();
