import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import {
  mapVideo,
  paginationInputSchema,
  paginationOutputSchema,
  videoSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listVideosTool = SlateTool.create(spec, {
  name: 'List My Videos',
  key: 'list_videos',
  description: `List videos from the authenticated user's account. Supports filtering by search query, sorting, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      query: z
        .string()
        .optional()
        .describe('Search query to filter videos by title or description'),
      sort: z
        .enum(['alphabetical', 'date', 'default', 'duration', 'modified_time', 'plays'])
        .optional()
        .describe('Sort order for the results'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of videos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.listMyVideos({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      query: ctx.input.query,
      sort: ctx.input.sort,
      direction: ctx.input.direction
    });

    let videos = (result.data ?? []).map(mapVideo);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? videos.length,
        videos
      },
      message:
        `Found **${result.total ?? videos.length}** videos` +
        (ctx.input.query ? ` matching "${ctx.input.query}"` : '')
    };
  })
  .build();
