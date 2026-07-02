import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleVideos = SlateTool.create(spec, {
  name: 'Google Videos Search',
  key: 'google_videos_search',
  description: `Scrape Google Videos search results. Returns video titles, URLs, thumbnails, durations, and source information. Configurable by country, language, and time range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The video search query'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".'),
      numResults: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page offset (0, 10, 20, etc.)'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time filter: "d" (day), "w" (week), "m" (month), "y" (year)'),
      advancedFilter: z.string().optional().describe('Advanced TBS filter parameter'),
      safeSearch: z
        .enum(['active', 'off'])
        .optional()
        .describe('Safe search filter. Defaults to "off".')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Videos search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleVideos({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      num: ctx.input.numResults,
      page: ctx.input.page,
      duration: ctx.input.timeFilter,
      tbs: ctx.input.advancedFilter,
      safe: ctx.input.safeSearch
    });

    return {
      output: { results: data },
      message: `Searched Google Videos for **"${ctx.input.query}"**.`
    };
  })
  .build();
