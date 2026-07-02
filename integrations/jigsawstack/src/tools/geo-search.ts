import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let geoSearch = SlateTool.create(spec, {
  name: 'Geo Search',
  key: 'geo_search',
  description: `Search for addresses, places, and points of interest. Optionally filter by country code or provide coordinates for proximity-based results. Also provides search suggestions for autocomplete functionality.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().describe('Search query for places, addresses, or points of interest'),
      countryCode: z.string().optional().describe('ISO 3 country code to filter results'),
      lat: z.number().optional().describe('Latitude for proximity-based search'),
      lng: z.number().optional().describe('Longitude for proximity-based search'),
      includeSuggestions: z
        .boolean()
        .optional()
        .describe('Also return autocomplete search suggestions (default: false)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      results: z
        .array(z.unknown())
        .optional()
        .describe('Geo search results with addresses, coordinates, and location metadata'),
      suggestions: z
        .array(z.string())
        .optional()
        .describe('Search suggestions for autocomplete (if includeSuggestions was true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.geoSearch({
      search: ctx.input.search,
      countryCode: ctx.input.countryCode,
      lat: ctx.input.lat,
      lng: ctx.input.lng
    });

    let output: Record<string, unknown> = {
      success: result.success,
      results: result.results ?? result.data
    };

    if (ctx.input.includeSuggestions) {
      let suggestions = await client.getSearchSuggestions({ query: ctx.input.search });
      output.suggestions = suggestions.suggestions;
    }

    return {
      output: output as any,
      message: `Geo search for **"${ctx.input.search}"** completed.${ctx.input.includeSuggestions ? ' Suggestions included.' : ''}`
    };
  })
  .build();
