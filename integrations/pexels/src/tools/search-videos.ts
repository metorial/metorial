import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchVideos = SlateTool.create(spec, {
  name: 'Search Videos',
  key: 'search_videos',
  description: `Search the Pexels library for royalty-free stock videos matching a keyword query. Supports filtering by orientation and size. Each video includes multiple file versions at different resolutions and preview pictures.`,
  constraints: ['Rate limited to 200 requests per hour.', 'Maximum 80 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('The search query (e.g., "nature", "city traffic", "cooking")'),
      orientation: z
        .enum(['landscape', 'portrait', 'square'])
        .optional()
        .describe('Desired video orientation'),
      size: z.enum(['large', 'medium', 'small']).optional().describe('Minimum video size'),
      locale: z
        .string()
        .optional()
        .describe('Locale for the search query (e.g., en-US, de-DE). Default: en-US'),
      page: z.number().optional().describe('Page number. Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 15, Max: 80')
    })
  )
  .output(
    z.object({
      videos: z.array(videoSchema).describe('List of matching videos'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchVideos({
      query: ctx.input.query,
      orientation: ctx.input.orientation,
      size: ctx.input.size,
      locale: ctx.input.locale,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Found **${result.pagination.totalResults}** videos for "${ctx.input.query}" (page ${result.pagination.page}, showing ${result.videos.length} results).`
    };
  })
  .build();
