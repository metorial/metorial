import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchLocations = SlateTool.create(spec, {
  name: 'Search Locations',
  key: 'search_locations',
  description: `Search for available SERP targeting locations by name. Returns location IDs, names, and hierarchical paths that can be used as the "loc" or "locId" parameter in SERP search tools. Locations vary by search engine.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Location search query, e.g. "New York", "London", "Tokyo"'),
      searchEngine: z
        .enum(['google', 'bing'])
        .default('google')
        .describe('Search engine to get locations for')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      locations: z
        .array(
          z.object({
            locationId: z.number().optional().describe('Unique location identifier'),
            name: z.string().optional().describe('Location name'),
            loc: z.string().optional().describe('Full hierarchical location path'),
            locationType: z
              .string()
              .optional()
              .describe('Location type (City, State, Country, etc.)'),
            countryCode: z.string().optional().describe('ISO country code')
          })
        )
        .describe('Matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.searchLocations({
      query: ctx.input.query,
      searchEngine: ctx.input.searchEngine
    });

    let rawLocations = response?.results ?? [];
    let locations = Array.isArray(rawLocations)
      ? rawLocations.map((loc: any) => ({
          locationId: loc.id,
          name: loc.name,
          loc: loc.loc,
          locationType: loc.type,
          countryCode: loc.country_code
        }))
      : [];

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        locations
      },
      message: `Found **${locations.length}** locations matching **"${ctx.input.query}"** for ${ctx.input.searchEngine}.`
    };
  })
  .build();
