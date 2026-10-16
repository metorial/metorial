import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
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
    let client = createClient(ctx);

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
      calendarId: z
        .string()
        .describe(
          'Calendar ID. Call list_calendars to discover IDs; PERSONAL and INSTITUTION identify those calendars.'
        ),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location'),
      start: z.string().describe('Start date/time (ISO 8601)'),
      end: z.string().describe('End date/time (ISO 8601)'),
      recurrence: z
        .object({
          frequency: z
            .enum(['Monthly', 'Weekly', 'Daily'])
            .describe('How often the item repeats'),
          count: z
            .number()
            .optional()
            .describe('Number of occurrences (positive whole number); use count or until'),
          until: z
            .string()
            .optional()
            .describe('Last recurrence date (ISO 8601); use count or until'),
          interval: z
            .number()
            .optional()
            .describe('Interval between occurrences (whole number, 1 through 100)'),
          monthRepeatDay: z.number().optional().describe('Day of the month, 1 through 31'),
          monthPosition: z
            .number()
            .optional()
            .describe('Monthly weekday occurrence: -1 for last, or 1 through 4'),
          repeatDay: z
            .enum([
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday'
            ])
            .optional(),
          weekDays: z
            .array(
              z.enum([
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday'
              ])
            )
            .optional()
        })
        .optional()
        .describe('Recurrence settings; required for OfficeHours calendar items'),
      ltiLaunchDeepLink: z
        .object({
          placementHandle: z.string().optional(),
          uuid: z.string().optional(),
          url: z.string().optional(),
          title: z.string().optional(),
          customParameters: z.record(z.string(), z.string()).optional()
        })
        .optional()
        .describe('Optional LTI launch deep-link details for calendar items')
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
    let client = createClient(ctx);

    let item = await client.createCalendarItem({
      type: ctx.input.type,
      calendarId: ctx.input.calendarId,
      title: ctx.input.title,
      description: ctx.input.description,
      location: ctx.input.location,
      start: ctx.input.start,
      end: ctx.input.end,
      recurrence: ctx.input.recurrence,
      ltiLaunchDeepLink: ctx.input.ltiLaunchDeepLink
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
