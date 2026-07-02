import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  name: z.string().optional().describe('Canonical location name'),
  countryCode: z.string().optional().describe('Country code'),
  latitude: z.number().optional().describe('Latitude coordinate'),
  longitude: z.number().optional().describe('Longitude coordinate'),
  reachCount: z.number().optional().describe('Population reach estimate')
});

export let lookupLocations = SlateTool.create(spec, {
  name: 'Lookup Locations',
  key: 'lookup_locations',
  description: `Look up geographic locations by name to get canonical location identifiers. Returns the top 10 matching locations with coordinates, country codes, and population reach. Use the returned location names as the **location** parameter in other search tools for precise geo-targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Location search term (e.g., "New York", "London", "Tokyo")')
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).describe('Matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.getLocations(ctx.input.query);

    let locations = (Array.isArray(data) ? data : data.locations || []).map((loc: any) => ({
      name: loc.name || loc.canonical_name,
      countryCode: loc.country_code,
      latitude: loc.latitude || loc.gps_coordinates?.latitude,
      longitude: loc.longitude || loc.gps_coordinates?.longitude,
      reachCount: loc.reach
    }));

    return {
      output: {
        locations
      },
      message: `Found ${locations.length} location${locations.length !== 1 ? 's' : ''} matching "${ctx.input.query}".`
    };
  })
  .build();
