import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let geocodeLocation = SlateTool.create(spec, {
  name: 'Geocode Location',
  key: 'geocode_location',
  description: `Convert a city name or address into geographic coordinates (latitude/longitude), or convert coordinates back into a place name. Useful for mapping, distance calculations, and location-based lookups.`,
  instructions: [
    'For forward geocoding, provide a city name. For reverse geocoding, provide lat and lon.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      city: z.string().optional().describe('City name for forward geocoding'),
      state: z.string().optional().describe('US state abbreviation (US only)'),
      country: z.string().optional().describe('Country name or ISO code'),
      lat: z.number().optional().describe('Latitude for reverse geocoding'),
      lon: z.number().optional().describe('Longitude for reverse geocoding')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            name: z.string().describe('Location name'),
            latitude: z.number().describe('Latitude coordinate'),
            longitude: z.number().describe('Longitude coordinate'),
            country: z.string().optional().describe('ISO country code')
          })
        )
        .describe('List of matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: Array<{
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
    }>;

    if (ctx.input.lat !== undefined && ctx.input.lon !== undefined) {
      let data = await client.reverseGeocode({ lat: ctx.input.lat, lon: ctx.input.lon });
      results = Array.isArray(data) ? data : [data];
    } else {
      let params: Record<string, string> = {};
      if (ctx.input.city) params.city = ctx.input.city;
      if (ctx.input.state) params.state = ctx.input.state;
      if (ctx.input.country) params.country = ctx.input.country;
      let data = await client.geocode(params);
      results = Array.isArray(data) ? data : [data];
    }

    let firstResult = results[0];
    let label = firstResult
      ? `**${firstResult.name}** → ${firstResult.latitude}, ${firstResult.longitude}`
      : 'No results found';

    return {
      output: {
        results: results.map((r: any) => ({
          name: r.name,
          latitude: r.latitude,
          longitude: r.longitude,
          country: r.country
        }))
      },
      message: `Found **${results.length}** result(s). ${label}`
    };
  })
  .build();
