import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let youtubeSearch = SlateTool.create(spec, {
  name: 'YouTube Search',
  key: 'youtube_search',
  description: `Search YouTube videos and get structured JSON results. Filter by upload date to find recent or older content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query for YouTube videos'),
      uploadDate: z
        .enum(['hour', 'today', 'week', 'month', 'year'])
        .optional()
        .describe('Filter by upload date'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      results: z
        .any()
        .describe(
          'Structured YouTube search results as JSON, including video titles, URLs, channels, views, and more'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.youtubeSearch({
      query: ctx.input.query,
      uploadDate: ctx.input.uploadDate,
      page: ctx.input.page
    });

    return {
      output: { results: result },
      message: `YouTube search completed for **"${ctx.input.query}"**.`
    };
  });
