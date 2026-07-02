import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mediaItemSchema = z.object({
  mediaId: z.string().describe('Unique media identifier'),
  contentType: z.string().optional().describe('MIME type'),
  contentLength: z.number().optional().describe('File size in bytes'),
  contentUri: z.string().optional().describe('URL to the media file'),
  thumbnailUri: z.string().optional().describe('URL to the thumbnail'),
  duration: z.number().nullable().optional().describe('Video duration in seconds'),
  resolution: z.string().nullable().optional().describe('Media resolution'),
  createdAt: z.string().optional().describe('Upload timestamp')
});

export let listMedia = SlateTool.create(spec, {
  name: 'List Media',
  key: 'list_media',
  description: `List media files in a team's media library with pagination and sorting. Returns file details including URLs, dimensions, and metadata. Use the returned mediaId values when attaching media to scheduled posts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of results per page (default 50)'),
      orderByField: z
        .enum(['CreatedAt', 'ContentLength'])
        .optional()
        .describe('Field to sort by'),
      orderByDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      media: z.array(mediaItemSchema).describe('List of media files'),
      nextCursor: z.string().nullable().optional().describe('Cursor for the next page'),
      totalCount: z.number().optional().describe('Total number of media files')
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

    let result = await client.listMedia(
      ctx.input.teamId,
      Object.keys(pagination).length > 0 ? pagination : undefined
    );

    let data = result.data || result;
    let items = Array.isArray(data) ? data : data.items || data.media || [];
    let media = items.map((m: any) => ({
      mediaId: m.id,
      contentType: m.contentType,
      contentLength: m.contentLength,
      contentUri: m.contentUri,
      thumbnailUri: m.thumbnailUri,
      duration: m.duration,
      resolution: m.resolution,
      createdAt: m.createdAt
    }));

    return {
      output: {
        media,
        nextCursor: data.next || null,
        totalCount: data.totalNumberOfRows
      },
      message: `Retrieved ${media.length} media file(s).`
    };
  });
