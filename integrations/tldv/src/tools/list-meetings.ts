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
        .describe('Filter by whether the authenticated user participated in the meeting.'),
      meetingType: z
        .enum(['internal', 'external'])
        .optional()
        .describe('Filter by meeting type.'),
      page: z.number().optional().describe('Page number for pagination (starts at 0).'),
      limit: z.number().optional().describe('Maximum number of meetings to return per page.')
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
      hasMore: z.boolean().describe('Whether more results are available on the next page.')
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

    return {
      output: {
        meetings,
        hasMore: result.hasMore ?? false
      },
      message: `Found **${meetings.length}** meeting(s).${result.hasMore ? ' More results are available on the next page.' : ''}`
    };
  })
  .build();
