import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let organicResultSchema = z
  .object({
    position: z.number().optional().describe('Position in search results'),
    title: z.string().optional().describe('Title of the result'),
    url: z.string().optional().describe('URL of the result'),
    destination: z.string().optional().describe('Display URL or breadcrumb'),
    description: z.string().optional().describe('Snippet text'),
    isAmp: z.boolean().optional().describe('Whether the page is AMP-enabled')
  })
  .passthrough();

let searchResultSchema = z
  .object({
    query: z
      .object({
        q: z.string().optional(),
        gl: z.string().optional(),
        hl: z.string().optional(),
        location: z.string().optional(),
        num: z.number().optional()
      })
      .passthrough()
      .optional()
      .describe('Echo of the query parameters used'),
    organicResults: z.array(organicResultSchema).optional().describe('Organic search results'),
    ads: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('Paid advertisement results'),
    peopleAlsoAsk: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('People Also Ask questions'),
    relatedSearches: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('Related search suggestions'),
    knowledgeGraph: z.record(z.string(), z.any()).optional().describe('Knowledge panel data'),
    answerBox: z
      .record(z.string(), z.any())
      .optional()
      .describe('Answer box / featured snippet')
  })
  .passthrough();

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Scrape structured web search results from Google, Bing, Yandex, or DuckDuckGo. Returns organic results, ads, People Also Ask, knowledge panels, answer boxes, and related searches. Supports geotargeting by location name or coordinates, language and country filtering, and pagination.`,
  instructions: [
    'Use `searchEngine` to target a specific engine: "google" (default), "bing", "yandex", or "duckduckgo".',
    'For geotargeting, provide either a `location` name (e.g. "New York, United States") or `latitude`/`longitude` coordinates.',
    'Use `start` for pagination; it represents the offset of results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      searchEngine: z
        .enum(['google', 'bing', 'yandex', 'duckduckgo'])
        .optional()
        .describe('Search engine to use (defaults to Google)'),
      location: z
        .string()
        .optional()
        .describe('Location for geotargeted results, e.g. "New York, United States"'),
      language: z
        .string()
        .optional()
        .describe('Language code (hl parameter), e.g. "en" for English'),
      country: z
        .string()
        .optional()
        .describe('Country code (gl parameter), e.g. "us" for United States'),
      numResults: z.number().optional().describe('Number of results to return (max 100)'),
      start: z.number().optional().describe('Result offset for pagination'),
      latitude: z.string().optional().describe('Latitude for precise geotargeting'),
      longitude: z.string().optional().describe('Longitude for precise geotargeting'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate')
    })
  )
  .output(searchResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.search({
      q: ctx.input.query,
      searchEngine: ctx.input.searchEngine,
      location: ctx.input.location,
      hl: ctx.input.language,
      gl: ctx.input.country,
      num: ctx.input.numResults,
      start: ctx.input.start,
      lat: ctx.input.latitude,
      lng: ctx.input.longitude,
      device: ctx.input.device
    });

    let organicCount = results.organic?.length ?? 0;
    let engine = ctx.input.searchEngine ?? 'google';

    return {
      output: {
        ...results,
        organicResults: results.organic
      },
      message: `Found **${organicCount}** organic results for "${ctx.input.query}" on ${engine}.`
    };
  })
  .build();
