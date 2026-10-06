import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let listMeetings = SlateTool.create(spec, {
  name: 'List Meetings',
  key: 'list_meetings',
  description: `Search and retrieve recorded meetings from tl;dv. Supports filtering by keyword, date range, participation status, and meeting type (internal/external). Returns paginated results with meeting metadata including organizer, invitees, duration, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search keyword to filter meetings by name or content.'),
      happenedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date string. Only return meetings that happened after this date.'),
      happenedBefore: z
        .string()
        .optional()
        .describe(
          'ISO 8601 date string. Only return meetings that happened before this date.'
        ),
      participated: z
        .boolean()
        .optional()
        .describe(
          'When true, only include meetings the authenticated user participated in. False includes all accessible meetings.'
        ),
      meetingType: z
        .enum(['internal', 'external'])
        .optional()
        .describe('Filter by meeting type.'),
      page: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'Page number, starting at 1 (default 1). The legacy value 0 also requests the first page.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Results per page, from 1 to 100 (default 50). Refine the date range for more than 10,000 results.'
        )
    })
  )
  .output(
    z.object({
      meetings: z
        .array(
          z.object({
            meetingId: z.string().describe('Unique meeting identifier.'),
            name: z.string().describe('Meeting title.'),
            happenedAt: z
              .string()
              .describe('ISO 8601 timestamp of when the meeting occurred.'),
            url: z.string().describe('tl;dv web URL for the meeting.'),
            duration: z.number().describe('Meeting duration in seconds.'),
            organizerName: z.string().optional().describe('Name of the meeting organizer.'),
            organizerEmail: z.string().optional().describe('Email of the meeting organizer.'),
            inviteeCount: z.number().describe('Number of invitees.')
          })
        )
        .describe('List of meetings matching the filters.'),
      hasMore: z.boolean().describe('Whether more results are available on the next page.'),
      page: z.number().describe('Current page number.'),
      pages: z.number().describe('Total number of pages.'),
      total: z.number().describe('Total number of matching meetings.'),
      pageSize: z.number().describe('Provider-reported page size.'),
      nextPage: z
        .number()
        .optional()
        .describe('Page to request next when more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });

    let result = await client.listMeetings({
      query: ctx.input.query,
      happenedAfter: ctx.input.happenedAfter,
      happenedBefore: ctx.input.happenedBefore,
      participated: ctx.input.participated,
      meetingType: ctx.input.meetingType,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let meetings = (result.results ?? []).map(m => ({
      meetingId: m.id,
      name: m.name,
      happenedAt: m.happenedAt,
      url: m.url,
      duration: m.duration,
      organizerName: m.organizer?.name,
      organizerEmail: m.organizer?.email,
      inviteeCount: m.invitees?.length ?? 0
    }));

    let hasMore = result.page < result.pages;
    return {
      output: {
        meetings,
        hasMore,
        page: result.page,
        pages: result.pages,
        total: result.total,
        pageSize: result.pageSize,
        nextPage: hasMore ? result.page + 1 : undefined
      },
      message: `Found **${meetings.length}** meeting(s).${hasMore ? ' More results are available on the next page.' : ''}`
    };
  })
  .build();
