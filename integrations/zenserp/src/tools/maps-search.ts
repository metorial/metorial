import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let localResultSchema = z
  .object({
    position: z.number().optional().describe('Position in results'),
    title: z.string().optional().describe('Business name'),
    placeId: z.string().optional().describe('Google Place ID'),
    address: z.string().optional().describe('Business address'),
    phone: z.string().optional().describe('Phone number'),
    rating: z.number().optional().describe('Average rating'),
    reviews: z.number().optional().describe('Number of reviews'),
    category: z.string().optional().describe('Business category'),
    website: z.string().optional().describe('Business website URL'),
    hours: z.string().optional().describe('Business hours'),
    thumbnail: z.string().optional().describe('Business photo URL')
  })
  .passthrough();

let mapsSearchResultSchema = z
  .object({
    query: z.record(z.string(), z.any()).optional().describe('Echo of query parameters'),
    localResults: z.array(localResultSchema).optional().describe('Local/Maps search results')
  })
  .passthrough();

export let mapsSearch = SlateTool.create(spec, {
  name: 'Maps Search',
  key: 'maps_search',
  description: `Search Google Maps / local business listings for a given query and location. Returns business names, addresses, ratings, reviews, phone numbers, and Google Place IDs. Supports geotargeting by location name or precise lat/lng coordinates.`,
  instructions: [
    'For precise geotargeting, provide `latitude` and `longitude` coordinates instead of a location name.',
    'Each result includes a `placeId` for further lookups.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Local search query, e.g. "pizza restaurants"'),
      location: z
        .string()
        .optional()
        .describe('Location name, e.g. "San Francisco, California"'),
      latitude: z.string().optional().describe('Latitude for precise geotargeting'),
      longitude: z.string().optional().describe('Longitude for precise geotargeting'),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z.string().optional().describe('Country code (gl), e.g. "us"'),
      numResults: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Result offset for pagination')
    })
  )
  .output(mapsSearchResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.search({
      q: ctx.input.query,
      tbm: 'lcl',
      location: ctx.input.location,
      lat: ctx.input.latitude,
      lng: ctx.input.longitude,
      hl: ctx.input.language,
      gl: ctx.input.country,
      num: ctx.input.numResults,
      start: ctx.input.start
    });

    let localResults = results.local_results ?? [];

    return {
      output: {
        ...results,
        localResults
      },
      message: `Found **${localResults.length}** local results for "${ctx.input.query}"${ctx.input.location ? ` near ${ctx.input.location}` : ''}.`
    };
  })
  .build();
