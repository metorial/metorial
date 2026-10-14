import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let youtubeSearch = SlateTool.create(spec, {
  name: 'YouTube Search',
  key: 'youtube_search',
  description:
    'Search YouTube for videos, channels, and ads. Returns provider result details and pagination metadata.',
  instructions: [
    'Pass the provider sp token returned in pagination metadata as paginationToken to retrieve another page; sp can also contain YouTube search filters.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('YouTube search query'),
      language: z.string().optional().describe('Interface language (hl), for example en'),
      country: z.string().optional().describe('Country code (gl), for example us'),
      paginationToken: z
        .string()
        .optional()
        .describe('Provider sp token for pagination or YouTube search filters')
    })
  )
  .output(
    z
      .object({
        videoResults: z.array(z.record(z.string(), z.any())).describe('YouTube video results')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.search({
      q: ctx.input.query,
      searchEngine: 'youtube',
      hl: ctx.input.language,
      gl: ctx.input.country,
      sp: ctx.input.paginationToken
    });
    let videoResults = results.video_results ?? [];
    return {
      output: { ...results, videoResults },
      message: `Found **${videoResults.length}** YouTube video results for "${ctx.input.query}".`
    };
  })
  .build();
