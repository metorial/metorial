import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let listMeetings = SlateTool.create(spec, {
  name: 'List Meetings',
  key: 'list_meetings',
  description: `List all meetings for a Zoom user. Supports filtering by meeting type (scheduled, live, upcoming) and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      type: z
        .enum(['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'])
        .optional()
        .describe('Type of meetings to list'),
      pageSize: z.number().optional().describe('Number of records per page (max 300)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of meetings'),
      nextPageToken: z.string().optional().describe('Token for next page of results'),
      meetings: z
        .array(
          z.object({
            meetingId: z.number().describe('Meeting ID'),
            uuid: z.string().optional().describe('Meeting UUID'),
            topic: z.string().describe('Meeting topic'),
            type: z.number().describe('Meeting type'),
            startTime: z.string().optional().describe('Start time'),
            duration: z.number().optional().describe('Duration in minutes'),
            timezone: z.string().optional().describe('Timezone'),
            joinUrl: z.string().optional().describe('Join URL'),
            createdAt: z.string().optional().describe('Creation time')
          })
        )
        .describe('List of meetings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listMeetings(ctx.input.userId, {
      type: ctx.input.type,
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let meetings = (result.meetings || []).map((m: any) => ({
      meetingId: m.id,
      uuid: m.uuid,
      topic: m.topic,
      type: m.type,
      startTime: m.start_time,
      duration: m.duration,
      timezone: m.timezone,
      joinUrl: m.join_url,
      createdAt: m.created_at
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        meetings
      },
      message: `Found **${meetings.length}** meeting(s)${result.total_records ? ` of ${result.total_records} total` : ''}.`
    };
  })
  .build();
