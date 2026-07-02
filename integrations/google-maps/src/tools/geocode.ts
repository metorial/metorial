import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let addressComponentSchema = z.object({
  longName: z.string().describe('Full text of the address component'),
  shortName: z.string().describe('Abbreviated form of the component'),
  types: z
    .array(z.string())
    .describe('Types for this component (e.g. street_number, route, locality)')
});

let geocodeResultSchema = z.object({
  formattedAddress: z.string().describe('Human-readable address'),
  placeId: z.string().describe('Unique place identifier'),
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  locationType: z
    .string()
    .describe(
      'Accuracy of the geocode (ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE)'
    ),
  types: z.array(z.string()).describe('Address types (e.g. street_address, locality)'),
  addressComponents: z.array(addressComponentSchema).describe('Broken-down address components')
});

export let geocodeTool = SlateTool.create(spec, {
  name: 'Geocode',
  key: 'geocode',
  description: `Convert between addresses and geographic coordinates. Supports **forward geocoding** (address → lat/lng) and **reverse geocoding** (lat/lng → address). Use forward mode to find the coordinates of a street address, or reverse mode to find what address corresponds to a given location.`,
  instructions: [
    'Provide either an address (forward geocoding) or latitude/longitude (reverse geocoding), but not both.',
    'Use the components filter to bias results to a specific country or region (e.g. "country:US").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z
        .string()
        .optional()
        .describe(
          'Street address to geocode (forward geocoding). Omit for reverse geocoding.'
        ),
      latitude: z
        .number()
        .optional()
        .describe('Latitude for reverse geocoding. Omit for forward geocoding.'),
      longitude: z
        .number()
        .optional()
        .describe('Longitude for reverse geocoding. Omit for forward geocoding.'),
      components: z
        .string()
        .optional()
        .describe('Component filter to bias results, pipe-separated (e.g. "country:US")'),
      bounds: z
        .string()
        .optional()
        .describe('Bounding box to bias results (format: "south,west|north,east")'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (e.g. "en", "fr", "de")'),
      region: z.string().optional().describe('Region bias as ccTLD code (e.g. "us", "uk")')
    })
  )
  .output(
    z.object({
      results: z.array(geocodeResultSchema).describe('Geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response: { status: string; results: Record<string, unknown>[] };

    if (ctx.input.address) {
      response = await client.geocodeAddress({
        address: ctx.input.address,
        components: ctx.input.components,
        bounds: ctx.input.bounds,
        language: ctx.input.language,
        region: ctx.input.region
      });
    } else if (ctx.input.latitude !== undefined && ctx.input.longitude !== undefined) {
      response = await client.reverseGeocode({
        latitude: ctx.input.latitude,
        longitude: ctx.input.longitude,
        language: ctx.input.language
      });
    } else {
      throw new Error(
        'Either address (forward geocoding) or latitude/longitude (reverse geocoding) is required.'
      );
    }

    if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }

    let results = (response.results || []).map((r: Record<string, unknown>) => {
      let geometry = r.geometry as Record<string, unknown>;
      let location = geometry.location as { lat: number; lng: number };
      let components = ((r.address_components as Record<string, unknown>[]) || []).map(c => ({
        longName: c.long_name as string,
        shortName: c.short_name as string,
        types: c.types as string[]
      }));

      return {
        formattedAddress: r.formatted_address as string,
        placeId: r.place_id as string,
        latitude: location.lat,
        longitude: location.lng,
        locationType: (geometry.location_type as string) || 'APPROXIMATE',
        types: (r.types as string[]) || [],
        addressComponents: components
      };
    });

    let isReverse = ctx.input.latitude !== undefined;
    let message = isReverse
      ? `Reverse geocoded (${ctx.input.latitude}, ${ctx.input.longitude}) → found **${results.length}** result(s).${results.length > 0 ? ` Top result: **${results[0]!.formattedAddress}**` : ''}`
      : `Geocoded "${ctx.input.address}" → found **${results.length}** result(s).${results.length > 0 ? ` Location: **(${results[0]!.latitude}, ${results[0]!.longitude})**` : ''}`;

    return {
      output: { results },
      message
    };
  })
  .build();
