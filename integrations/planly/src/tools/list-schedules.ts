import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mediaItemSchema = z.object({
  mediaId: z.string().describe('Media file ID'),
  contentUri: z.string().optional().describe('URL to the media file'),
  thumbnailUri: z.string().optional().describe('URL to the thumbnail'),
  contentType: z.any().optional().describe('Media content type')
});

let scheduleSchema = z.object({
  scheduleId: z.string().describe('Unique schedule identifier'),
  content: z.string().nullable().optional().describe('Post text content'),
  status: z.string().optional().describe('Schedule status'),
  publishOn: z.string().nullable().optional().describe('Scheduled publish time'),
  createdAt: z.string().optional().describe('When the schedule was created'),
  media: z.array(mediaItemSchema).optional().describe('Attached media files')
});

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `Retrieve scheduled posts for a team with pagination support. Returns post content, status, publish time, and attached media.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to list schedules for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of results per page (default 50)'),
      orderByField: z.enum(['CreatedAt', 'PublishOn']).optional().describe('Field to sort by'),
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

    let pagination: any = {};
    if (ctx.input.cursor) pagination.cursor = ctx.input.cursor;
    if (ctx.input.pageSize) pagination.pageSize = ctx.input.pageSize;
    if (ctx.input.orderByField && ctx.input.orderByDirection) {
      pagination.orderBy = [ctx.input.orderByField, ctx.input.orderByDirection];
    }

    let result = await client.listSchedules(
      ctx.input.teamId,
      Object.keys(pagination).length > 0 ? pagination : undefined
    );

    let data = result.data || result;
    let items = Array.isArray(data) ? data : data.items || data.schedules || [];
    let schedules = items.map((s: any) => ({
      scheduleId: s.id,
      content: s.content,
      status: s.status,
      publishOn: s.publish_on || s.publishOn,
      createdAt: s.created_at || s.createdAt,
      media: (s.media || []).map((m: any) => ({
        mediaId: m.id,
        contentUri: m.contentUri,
        thumbnailUri: m.thumbnailUri,
        contentType: m.contentType
      }))
    }));

    return {
      output: {
        schedules,
        nextCursor: data.next || null,
        totalCount: data.totalNumberOfRows
      },
      message: `Retrieved ${schedules.length} schedule(s).`
    };
  });
