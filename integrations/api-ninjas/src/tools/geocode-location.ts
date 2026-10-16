import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { locationParams } from '../lib/location';
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
      raw: z.unknown().optional().describe('Original provider response'),
      results: z
        .array(
          z.object({
            name: z.string().describe('Location name'),
            latitude: z
              .number()
              .optional()
              .describe('Latitude coordinate when returned by the provider'),
            longitude: z
              .number()
              .optional()
              .describe('Longitude coordinate when returned by the provider'),
            country: z.string().optional().describe('ISO country code')
          })
        )
        .describe('List of matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let raw: unknown;
    let results: Array<{
      name: string;
      latitude?: number | null;
      longitude?: number | null;
      country?: string;
    }>;

    if (ctx.input.lat !== undefined && ctx.input.lon !== undefined) {
      locationParams(ctx.input);
      let data = await client.reverseGeocode({ lat: ctx.input.lat, lon: ctx.input.lon });
      raw = data;
      results = Array.isArray(data) ? data : [data];
    } else {
      let params = locationParams(ctx.input);
      let data = await client.geocode(params);
      raw = data;
      results = Array.isArray(data) ? data : [data];
    }

    let mapped = results.map(result => ({
      name: result.name,
      latitude: result.latitude ?? undefined,
      longitude: result.longitude ?? undefined,
      country: result.country ?? undefined
    }));
    let firstResult = mapped[0];
    let label = firstResult
      ? `**${firstResult.name}**${typeof firstResult.latitude === 'number' && typeof firstResult.longitude === 'number' ? ` → ${firstResult.latitude}, ${firstResult.longitude}` : ''}`
      : 'No results found';

    return {
      output: {
        raw,
        results: mapped
      },
      message: `Found **${results.length}** result(s). ${label}`
    };
  })
  .build();
