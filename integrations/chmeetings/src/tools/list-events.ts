import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paginationFields = {
  page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page (default: 100)')
};
let organizationId = z
  .string()
  .optional()
  .describe('Organization ID from list_organizations. Omit for the current organization.');
let rangeFields = {
  from: z.iso.date().describe('First date to include (YYYY-MM-DD)'),
  to: z.iso.date().describe('Last date to include (YYYY-MM-DD); within 366 days of from'),
  organizationId,
  ...paginationFields
};
let pagingOutput = {
  page: z.number().describe('Current page number'),
  pageSize: z.number().describe('Page size'),
  total: z.number().describe('Total matching records')
};

let validateDateRange = (from: string, to: string) => {
  let days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days < 0 || days > 366) {
    throw createApiServiceError(
      'Choose a date range with to on or after from and no more than 366 days apart.'
    );
  }
};

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description:
    'Retrieve church or ministry events within a date range. Returns event IDs for list_event_occurrences. Discover ministry IDs with list_organizations.',
  tags: { readOnly: true }
})
  .input(z.object(rangeFields))
  .output(z.object({ events: z.array(z.record(z.string(), z.unknown())), ...pagingOutput }))
  .handleInvocation(async ctx => {
    validateDateRange(ctx.input.from, ctx.input.to);
    let result = await new Client({ token: ctx.auth.token }).listEvents(ctx.input);
    return {
      output: {
        events: result.data,
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** events. Showing page ${result.page}.`
    };
  })
  .build();

export let listEventOccurrences = SlateTool.create(spec, {
  name: 'List Event Occurrences',
  key: 'list_event_occurrences',
  description:
    'Retrieve scheduled occurrences of an event, including recurring and computed occurrences. Use an event ID from list_events and occurrence IDs with list_occurrence_attendance.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z.number().int().positive().describe('Event ID from list_events'),
      ...rangeFields
    })
  )
  .output(
    z.object({ occurrences: z.array(z.record(z.string(), z.unknown())), ...pagingOutput })
  )
  .handleInvocation(async ctx => {
    validateDateRange(ctx.input.from, ctx.input.to);
    let result = await new Client({ token: ctx.auth.token }).listEventOccurrences(
      ctx.input.eventId,
      ctx.input
    );
    return {
      output: {
        occurrences: result.data,
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** event occurrences. Showing page ${result.page}.`
    };
  })
  .build();

export let listOccurrenceAttendance = SlateTool.create(spec, {
  name: 'List Occurrence Attendance',
  key: 'list_occurrence_attendance',
  description:
    'Retrieve attendance for an event occurrence. Use an occurrence ID from list_event_occurrences. Filter by attendance status or group membership.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      occurrenceId: z.string().min(1).describe('Occurrence ID from list_event_occurrences'),
      organizationId,
      status: z
        .enum(['all', 'attended', 'absent'])
        .optional()
        .describe('Attendance status filter'),
      groupId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Group ID from list_groups; cannot be combined with ungrouped=true'),
      ungrouped: z
        .boolean()
        .optional()
        .describe('Only people without a group; cannot be combined with groupId'),
      ...paginationFields
    })
  )
  .output(
    z.object({ attendance: z.array(z.record(z.string(), z.unknown())), ...pagingOutput })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.groupId !== undefined && ctx.input.ungrouped) {
      throw createApiServiceError('Provide groupId or ungrouped=true, rather than both.');
    }
    let result = await new Client({ token: ctx.auth.token }).listOccurrenceAttendance(
      ctx.input.occurrenceId,
      ctx.input
    );
    return {
      output: {
        attendance: result.data,
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** attendance records. Showing page ${result.page}.`
    };
  })
  .build();
