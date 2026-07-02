import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  locationId: z.number().optional().describe('SerpApi location ID'),
  googleId: z.number().optional().describe('Google location ID'),
  name: z.string().optional().describe('Location display name'),
  canonicalName: z
    .string()
    .optional()
    .describe('Full hierarchical name (e.g., "Austin,Texas,United States")'),
  countryCode: z.string().optional().describe('ISO country code'),
  targetType: z
    .string()
    .optional()
    .describe('Location type (e.g., "DMA Region", "City", "Country")'),
  reach: z.number().optional().describe('Audience size for this location'),
  gpsCoordinates: z.array(z.number()).optional().describe('Latitude and longitude coordinates')
});

export let locationsLookupTool = SlateTool.create(spec, {
  name: 'Locations Lookup',
  key: 'locations_lookup',
  description: `Look up supported Google locations for use with the location parameter in other search tools. Returns location names, IDs, country codes, and audience reach. Useful for finding the correct location string for geographically targeted searches.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Location search query (e.g., "Austin", "London", "Tokyo")'),
      limit: z.number().optional().describe('Maximum number of results to return (max 10)')
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).describe('Matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let data = await client.getLocations(ctx.input.query, ctx.input.limit);

    let locations = (Array.isArray(data) ? data : []).map((l: any) => ({
      locationId: l.id,
      googleId: l.google_id,
      name: l.name,
      canonicalName: l.canonical_name,
      countryCode: l.country_code,
      targetType: l.target_type,
      reach: l.reach,
      gpsCoordinates: l.gps
    }));

    return {
      output: {
        locations
      },
      message: `Found **${locations.length}** locations matching "${ctx.input.query}".`
    };
  })
  .build();
