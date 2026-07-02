import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleNews = SlateTool.create(spec, {
  name: 'Google News Search',
  key: 'google_news_search',
  description: `Scrape real-time Google News results from over a thousand sources. Returns news articles matching the query, configurable by country, language, and time range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The news search query'),
      country: z
        .string()
        .optional()
        .describe(
          'Country code in ISO 3166 Alpha-2 format (e.g., "us", "gb"). Defaults to "us".'
        ),
      language: z
        .string()
        .optional()
        .describe('Language of results (e.g., "en_us"). Defaults to "en_us".'),
      numResults: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page offset for pagination (0, 10, 20, etc.)'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time filter: "d" (day), "w" (week), "m" (month), "y" (year)'),
      safeSearch: z
        .enum(['active', 'off'])
        .optional()
        .describe('Safe search filter. Defaults to "off".')
    })
  )
  .output(
    z.object({
      results: z.any().describe('News results from Google News')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleNews({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      num: ctx.input.numResults,
      page: ctx.input.page,
      duration: ctx.input.timeFilter,
      safe: ctx.input.safeSearch
    });

    return {
      output: { results: data },
      message: `Fetched Google News results for **"${ctx.input.query}"**.`
    };
  })
  .build();
