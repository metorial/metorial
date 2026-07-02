import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bingSearch = SlateTool.create(spec, {
  name: 'Bing Search',
  key: 'bing_search',
  description: `Scrape Bing search results in real-time. Returns organic search results with titles, URLs, and snippets. Supports geo-targeting by country, coordinates, and market.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The Bing search query'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      latitude: z
        .string()
        .optional()
        .describe('Latitude coordinate for location-based results'),
      longitude: z
        .string()
        .optional()
        .describe('Longitude coordinate for location-based results'),
      market: z.string().optional().describe('Market origin (e.g., "en-US")'),
      offset: z
        .number()
        .optional()
        .describe('Offset for organic results pagination. Defaults to 1.'),
      count: z.number().optional().describe('Number of results per page'),
      safeSearch: z
        .enum(['off', 'moderate', 'strict'])
        .optional()
        .describe('Safe search filter. Defaults to "off".'),
      filters: z.string().optional().describe('Bing search filters')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Bing search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.bingSearch({
      q: ctx.input.query,
      location: ctx.input.country,
      lat: ctx.input.latitude,
      long: ctx.input.longitude,
      mkt: ctx.input.market,
      first: ctx.input.offset,
      count: ctx.input.count,
      safeSearch: ctx.input.safeSearch,
      filters: ctx.input.filters
    });

    return {
      output: { results: data },
      message: `Searched Bing for **"${ctx.input.query}"**.`
    };
  })
  .build();
