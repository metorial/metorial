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

export let searchVideosTool = SlateTool.create(spec, {
  name: 'Search Videos',
  key: 'search_videos',
  description: `Search for videos across all of Vimeo by keywords. Results can be sorted by relevance, date, plays, likes, comments, or duration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      query: z.string().describe('Search query keywords'),
      sort: z
        .enum(['relevant', 'date', 'alphabetical', 'plays', 'likes', 'comments', 'duration'])
        .optional()
        .describe('Sort order for the results'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      filter: z
        .enum([
          'CC',
          'CC-BY',
          'CC-BY-NC',
          'CC-BY-NC-ND',
          'CC-BY-NC-SA',
          'CC-BY-ND',
          'CC-BY-SA',
          'CC0',
          'categories',
          'duration',
          'in-progress',
          'minimum_likes',
          'trending',
          'upload_date'
        ])
        .optional()
        .describe('Filter to apply to results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of matching videos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.searchVideos(ctx.input.query, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      filter: ctx.input.filter
    });

    let videos = (result.data ?? []).map(mapVideo);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? videos.length,
        videos
      },
      message: `Found **${result.total ?? videos.length}** videos matching "${ctx.input.query}"`
    };
  })
  .build();
