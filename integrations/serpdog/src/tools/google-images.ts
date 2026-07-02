import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleImages = SlateTool.create(spec, {
  name: 'Google Images Search',
  key: 'google_images_search',
  description: `Scrape Google Images search results. Returns image URLs, titles, sources, and metadata. Configurable by country, language, and various filters including size, color, and license.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The image search query'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".'),
      googleDomain: z
        .string()
        .optional()
        .describe('Google domain for local results. Defaults to "google.com".'),
      page: z
        .number()
        .optional()
        .describe('Page number for results (0 for first page, 1 for second, etc.)'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time filter: "d" (day), "w" (week), "m" (month), "y" (year)'),
      advancedFilter: z
        .string()
        .optional()
        .describe('TBS filter for size, color, type, and license filtering'),
      chips: z.string().optional().describe('Filter results using suggested search chips'),
      safeSearch: z
        .enum(['active', 'off'])
        .optional()
        .describe('Safe search filter. Defaults to "off".')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Images search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleImages({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      domain: ctx.input.googleDomain,
      ijn: ctx.input.page,
      duration: ctx.input.timeFilter,
      tbs: ctx.input.advancedFilter,
      chips: ctx.input.chips,
      safe: ctx.input.safeSearch
    });

    return {
      output: { results: data },
      message: `Searched Google Images for **"${ctx.input.query}"**.`
    };
  })
  .build();
