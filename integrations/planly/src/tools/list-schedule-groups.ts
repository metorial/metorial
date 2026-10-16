import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ScheduleGroupListOptions } from '../lib/client';
import {
  mapSchedule,
  nullableString,
  pageMetadata,
  paginationFor,
  rawSchema,
  requiredString,
  responseArray,
  responseData,
  responseItems,
  responseRecord,
  scalarString,
  teamIdSchema
} from '../lib/responses';
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
        status: z.string().optional().describe('Schedule status'),
        raw: rawSchema
      })
    )
    .optional()
    .describe('Schedules in the group'),
  raw: rawSchema
});

export let listScheduleGroups = SlateTool.create(spec, {
  name: 'List Schedule Groups',
  key: 'list_schedule_groups',
  description: `Retrieve schedule groups for a team with filtering and pagination. Filter by channel, status, social network, media type, and date range. Call list_teams to discover the team ID.`,
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
      teamId: teamIdSchema,
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
      pageSize: z.number().optional().describe('Results per page'),
      orderByField: z
        .enum(['CreatedAt', 'ContentLength'])
        .optional()
        .describe('Field to sort by'),
      orderByDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
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
    let options: ScheduleGroupListOptions = {
      ids: ctx.input.groupIds,
      filter: {
        channels: ctx.input.channelIds,
        status: ctx.input.statusCodes,
        socialNetworks: ctx.input.socialNetworks,
        mediaType: ctx.input.mediaTypes
      },
      dateRange: { since: ctx.input.since, until: ctx.input.until },
      pagination: paginationFor(ctx.input)
    };
    let data = responseData(await client.listScheduleGroups(ctx.input.teamId, options));
    let groups = responseItems(data, ['items', 'scheduleGroups']).map(value => {
      let group = responseRecord(value, 'schedule group');
      let publishOn = group.publishOn !== undefined ? group.publishOn : group.publish_on;
      return {
        scheduleGroupId: requiredString(group.id, 'schedule group ID'),
        status: scalarString(group.status),
        publishOn: nullableString(publishOn),
        schedules:
          group.schedules === undefined
            ? undefined
            : responseArray(group.schedules, 'group schedules').map(value =>
                mapSchedule(value, publishOn)
              ),
        raw: group
      };
    });
    return {
      output: { groups, ...pageMetadata(data) },
      message: `Retrieved ${groups.length} schedule group(s).`
    };
  });
