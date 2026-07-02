import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalendarItems = SlateTool.create(spec, {
  name: 'List Calendar Items',
  key: 'list_calendar_items',
  description: `List calendar items from Blackboard Learn. Filter by course, type, or date range. Includes personal, course, and system calendar events.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().optional().describe('Filter by course ID'),
      type: z
        .string()
        .optional()
        .describe('Filter by calendar type (e.g., "Course", "Personal", "Institution")'),
      since: z.string().optional().describe('Start of date range (ISO 8601)'),
      until: z.string().optional().describe('End of date range (ISO 8601)'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          calendarItemId: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          type: z.string().optional(),
          calendarId: z.string().optional(),
          location: z.string().optional()
        })
      ),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listCalendarItems({
      courseId: ctx.input.courseId,
      type: ctx.input.type,
      since: ctx.input.since,
      until: ctx.input.until,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let items = (result.results || []).map((item: any) => ({
      calendarItemId: item.id,
      title: item.title,
      description: item.description,
      start: item.start,
      end: item.end,
      type: item.type,
      calendarId: item.calendarId,
      location: item.location
    }));

    return {
      output: { items, hasMore: !!result.paging?.nextPage },
      message: `Found **${items.length}** calendar item(s).`
    };
  })
  .build();

export let createCalendarItem = SlateTool.create(spec, {
  name: 'Create Calendar Item',
  key: 'create_calendar_item',
  description: `Create a calendar item in Blackboard Learn. Can create personal, course, or system calendar events.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      type: z.string().describe('Calendar type (e.g., "Course", "Personal", "Institution")'),
      calendarId: z.string().describe('Calendar ID (e.g., course ID for course calendars)'),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location'),
      start: z.string().describe('Start date/time (ISO 8601)'),
      end: z.string().describe('End date/time (ISO 8601)')
    })
  )
  .output(
    z.object({
      calendarItemId: z.string().optional(),
      title: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      type: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let item = await client.createCalendarItem({
      type: ctx.input.type,
      calendarId: ctx.input.calendarId,
      title: ctx.input.title,
      description: ctx.input.description,
      location: ctx.input.location,
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: {
        calendarItemId: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        type: item.type
      },
      message: `Created calendar item **${ctx.input.title}**.`
    };
  })
  .build();
