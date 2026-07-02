import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let popularVideos = SlateTool.create(spec, {
  name: 'Popular Videos',
  key: 'popular_videos',
  description: `Browse currently popular and trending videos on Pexels. Supports filtering by minimum/maximum dimensions and duration. Useful for discovering trending video content without a specific search query.`,
  constraints: ['Rate limited to 200 requests per hour.', 'Maximum 80 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      minWidth: z.number().optional().describe('Minimum width in pixels of returned videos'),
      minHeight: z.number().optional().describe('Minimum height in pixels of returned videos'),
      minDuration: z
        .number()
        .optional()
        .describe('Minimum duration in seconds of returned videos'),
      maxDuration: z
        .number()
        .optional()
        .describe('Maximum duration in seconds of returned videos'),
      page: z.number().optional().describe('Page number. Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 15, Max: 80')
    })
  )
  .output(
    z.object({
      videos: z.array(videoSchema).describe('List of popular videos'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPopularVideos({
      minWidth: ctx.input.minWidth,
      minHeight: ctx.input.minHeight,
      minDuration: ctx.input.minDuration,
      maxDuration: ctx.input.maxDuration,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Retrieved **${result.videos.length}** popular videos (page ${result.pagination.page}).`
    };
  })
  .build();
