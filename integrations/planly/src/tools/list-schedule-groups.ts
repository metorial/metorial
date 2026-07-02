import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleGroupSchema = z.object({
  scheduleGroupId: z.string().describe('Group identifier'),
  status: z.string().optional().describe('Group status'),
  publishOn: z.string().nullable().optional().describe('Scheduled publish time'),
  schedules: z
    .array(
      z.object({
        scheduleId: z.string().describe('Schedule identifier'),
        channelId: z.string().optional().describe('Target channel ID'),
        content: z.string().nullable().optional().describe('Post text content'),
        status: z.string().optional().describe('Schedule status')
      })
    )
    .optional()
    .describe('Schedules in the group')
});

export let listScheduleGroups = SlateTool.create(spec, {
  name: 'List Schedule Groups',
  key: 'list_schedule_groups',
  description: `Retrieve schedule groups for a team with filtering and pagination. Filter by channel, status, social network, media type, and date range.`,
  instructions: [
    'Status codes: 0 = Draft, 1 = Scheduled, 3 = Published, 4 = Failed.',
    'Social network values: threads, youtube, instagram, tiktok, tiktok_business, twitter, pinterest, facebook, linkedin, mastodon, bluesky.',
    'Media type: 0 = Image, 1 = Video.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      groupIds: z.array(z.string()).optional().describe('Filter by specific group IDs'),
      channelIds: z.array(z.string()).optional().describe('Filter by channel IDs'),
      statusCodes: z
        .array(z.number())
        .optional()
        .describe('Filter by status (0=Draft, 1=Scheduled, 3=Published, 4=Failed)'),
      socialNetworks: z.array(z.string()).optional().describe('Filter by social network type'),
      mediaTypes: z
        .array(z.number())
        .optional()
        .describe('Filter by media type (0=Image, 1=Video)'),
      since: z.string().optional().describe('Start of date range filter (ISO 8601)'),
      until: z.string().optional().describe('End of date range filter (ISO 8601)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      groups: z.array(scheduleGroupSchema).describe('Schedule groups'),
      nextCursor: z.string().nullable().optional().describe('Cursor for next page'),
      totalCount: z.number().optional().describe('Total number of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let options: any = {};
    if (ctx.input.groupIds) options.ids = ctx.input.groupIds;

    let filter: any = {};
    if (ctx.input.channelIds) filter.channels = ctx.input.channelIds;
    if (ctx.input.statusCodes) filter.status = ctx.input.statusCodes;
    if (ctx.input.socialNetworks) filter.socialNetworks = ctx.input.socialNetworks;
    if (ctx.input.mediaTypes) filter.mediaType = ctx.input.mediaTypes;
    if (Object.keys(filter).length > 0) options.filter = filter;

    if (ctx.input.since || ctx.input.until) {
      options.dateRange = {};
      if (ctx.input.since) options.dateRange.since = ctx.input.since;
      if (ctx.input.until) options.dateRange.until = ctx.input.until;
    }

    let pagination: any = {};
    if (ctx.input.cursor) pagination.cursor = ctx.input.cursor;
    if (ctx.input.pageSize) pagination.pageSize = ctx.input.pageSize;
    if (Object.keys(pagination).length > 0) options.pagination = pagination;

    let result = await client.listScheduleGroups(
      ctx.input.teamId,
      Object.keys(options).length > 0 ? options : undefined
    );

    let data = result.data || result;
    let items = Array.isArray(data) ? data : data.items || data.scheduleGroups || [];
    let groups = items.map((g: any) => ({
      scheduleGroupId: g.id,
      status: g.status,
      publishOn: g.publishOn || g.publish_on,
      schedules: (g.schedules || []).map((s: any) => ({
        scheduleId: s.id,
        channelId: s.channelId || s.channel_id,
        content: s.content,
        status: s.status
      }))
    }));

    return {
      output: {
        groups,
        nextCursor: data.next || null,
        totalCount: data.totalNumberOfRows
      },
      message: `Retrieved ${groups.length} schedule group(s).`
    };
  });
