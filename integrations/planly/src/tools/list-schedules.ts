import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  mapSchedule,
  pageMetadata,
  paginationFor,
  rawSchema,
  responseData,
  responseItems,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

let mediaItemSchema = z.object({
  mediaId: z.string().describe('Media file ID'),
  contentUri: z.string().optional().describe('URL to the media file'),
  thumbnailUri: z.string().optional().describe('URL to the thumbnail'),
  contentType: z.any().optional().describe('Media content type'),
  raw: rawSchema
});

let scheduleSchema = z.object({
  scheduleId: z.string().describe('Unique schedule identifier'),
  content: z.string().nullable().optional().describe('Post text content'),
  status: z.string().optional().describe('Schedule status'),
  publishOn: z.string().nullable().optional().describe('Scheduled publish time'),
  createdAt: z.string().optional().describe('When the schedule was created'),
  media: z.array(mediaItemSchema).optional().describe('Attached media files'),
  channelId: z.string().optional().describe('Target channel ID'),
  url: z.string().nullable().optional().describe('Published post URL'),
  errorMessage: z
    .string()
    .nullable()
    .optional()
    .describe('Publishing error reported by Planly'),
  raw: rawSchema
});

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `Retrieve scheduled posts for a team with pagination support. Returns post content, status, publish time, and attached media. Call list_teams to discover the team ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of results per page (default 50)'),
      orderByField: z
        .enum(['CreatedAt', 'PublishOn', 'ContentLength'])
        .optional()
        .describe('Field to sort by'),
      orderByDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      schedules: z.array(scheduleSchema).describe('List of scheduled posts'),
      nextCursor: z
        .string()
        .nullable()
        .optional()
        .describe('Cursor for the next page of results'),
      totalCount: z.number().optional().describe('Total number of schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = responseData(
      await client.listSchedules(ctx.input.teamId, paginationFor(ctx.input))
    );
    let schedules = responseItems(data, ['items', 'schedules']).map(value =>
      mapSchedule(value)
    );
    return {
      output: { schedules, ...pageMetadata(data) },
      message: `Retrieved ${schedules.length} schedule(s).`
    };
  });
