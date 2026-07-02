import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let geocodeResultSchema = z.object({
  name: z.string().optional().describe('Place name'),
  country: z.string().optional().describe('Country name'),
  city: z.string().optional().describe('City name'),
  state: z.string().optional().describe('State/region name'),
  street: z.string().optional().describe('Street name'),
  houseNumber: z.string().optional().describe('House number'),
  postcode: z.string().optional().describe('Postal code'),
  latitude: z.number().describe('Latitude of the result'),
  longitude: z.number().describe('Longitude of the result'),
  osmId: z.number().optional().describe('OpenStreetMap ID'),
  osmType: z.string().optional().describe('OSM type: N (Node), W (Way), R (Relation)'),
  osmKey: z.string().optional().describe('OSM key (e.g., "place", "building")'),
  osmValue: z.string().optional().describe('OSM value (e.g., "city", "residential")'),
  extent: z
    .array(z.number())
    .optional()
    .describe('Bounding box [minLon, maxLat, maxLon, minLat]')
});

export let geocode = SlateTool.create(spec, {
  name: 'Geocode',
  key: 'geocode',
  description: `Convert addresses to coordinates (forward geocoding) or coordinates to addresses (reverse geocoding).
Supports multiple providers, country filtering, bounding box filtering, and OSM tag filtering.
Use for address lookup, place search, or finding what is at a given coordinate.`,
  instructions: [
    'For forward geocoding, provide a query string.',
    'For reverse geocoding, set reverse to true and provide a point as "latitude,longitude".',
    'OSM tag filtering (osmTags) only works with the default provider.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Address or place name to search for (forward geocoding)'),
      reverse: z
        .boolean()
        .optional()
        .describe('Set to true for reverse geocoding (coordinate to address)'),
      point: z
        .string()
        .optional()
        .describe(
          'Coordinate as "latitude,longitude" - used as bias for forward geocoding or lookup point for reverse'
        ),
      locale: z.string().optional().describe('Language for results (e.g., "en", "de", "fr")'),
      limit: z.number().optional().describe('Maximum number of results (default 5)'),
      provider: z
        .enum(['default', 'nominatim', 'gisgraphy', 'opencagedata'])
        .optional()
        .describe('Geocoding provider'),
      countryCode: z
        .string()
        .optional()
        .describe('Filter by country ISO 3166-1 Alpha 2 code (e.g., "us", "de", "gb")'),
      bounds: z
        .string()
        .optional()
        .describe('Bounding box filter as "minLon,minLat,maxLon,maxLat"'),
      osmTags: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by OSM tags (default provider only). E.g., ["tourism:museum", "!industrial"]'
        )
    })
  )
  .output(
    z.object({
      results: z.array(geocodeResultSchema).describe('Geocoding results'),
      locale: z.string().optional().describe('Locale used for results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let result = await client.geocode({
      query: ctx.input.query,
      reverse: ctx.input.reverse,
      point: ctx.input.point,
      locale: ctx.input.locale,
      limit: ctx.input.limit,
      provider: ctx.input.provider,
      countryCode: ctx.input.countryCode,
      bounds: ctx.input.bounds,
      osmTag: ctx.input.osmTags
    });

    let results = ((result.hits || []) as Record<string, unknown>[]).map(hit => ({
      name: hit.name as string | undefined,
      country: hit.country as string | undefined,
      city: hit.city as string | undefined,
      state: hit.state as string | undefined,
      street: hit.street as string | undefined,
      houseNumber: hit.housenumber as string | undefined,
      postcode: hit.postcode as string | undefined,
      latitude: (hit.point as Record<string, number>)?.lat ?? 0,
      longitude: (hit.point as Record<string, number>)?.lng ?? 0,
      osmId: hit.osm_id as number | undefined,
      osmType: hit.osm_type as string | undefined,
      osmKey: hit.osm_key as string | undefined,
      osmValue: hit.osm_value as string | undefined,
      extent: hit.extent as number[] | undefined
    }));

    let isReverse = ctx.input.reverse;
    let actionDescription = isReverse
      ? 'Reverse geocoded'
      : `Searched for "${ctx.input.query}"`;

    return {
      output: {
        results,
        locale: result.locale as string | undefined
      },
      message: `${actionDescription}. Found **${results.length}** result(s).${results.length > 0 ? ` Top result: **${results[0]!.name || results[0]!.street || 'Unknown'}**${results[0]!.city ? `, ${results[0]!.city}` : ''}${results[0]!.country ? `, ${results[0]!.country}` : ''}` : ''}`
    };
  })
  .build();
