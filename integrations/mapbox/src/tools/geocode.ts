import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let geocodeFeatureSchema = z.object({
  placeName: z.string().optional().describe('Human-readable place name'),
  text: z.string().optional().describe('Feature text label'),
  center: z.array(z.number()).optional().describe('[longitude, latitude] coordinates'),
  placeType: z
    .array(z.string())
    .optional()
    .describe('Feature types (e.g., address, poi, place)'),
  relevance: z.number().optional().describe('Relevance score from 0 to 1'),
  bbox: z
    .array(z.number())
    .optional()
    .describe('Bounding box [minLon, minLat, maxLon, maxLat]'),
  context: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().optional(),
        shortCode: z.string().optional()
      })
    )
    .optional()
    .describe('Hierarchical context (neighborhood, city, region, country)'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional feature properties')
});

export let geocodeTool = SlateTool.create(spec, {
  name: 'Geocode',
  key: 'geocode',
  description: `Convert between addresses/place names and geographic coordinates. Supports **forward geocoding** (text to coordinates) and **reverse geocoding** (coordinates to place name). Use forward mode to find coordinates for an address or place, and reverse mode to find what's at a given location.`,
  instructions: [
    'For forward geocoding, provide a searchText. For reverse geocoding, provide longitude and latitude.',
    'Use the "types" parameter to filter results (e.g., "address", "poi", "place", "region", "country").',
    'Use "proximity" as "longitude,latitude" to bias results toward a location.'
  ],
  constraints: [
    'Search text is limited to 256 characters and 20 words.',
    'Returns up to 5 results by default (max 10).',
    'Results must be used in conjunction with a Mapbox map.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['forward', 'reverse'])
        .describe('Geocoding mode: "forward" (text to coords) or "reverse" (coords to text)'),
      searchText: z
        .string()
        .optional()
        .describe(
          'Text to geocode (required for forward mode). Can be an address, place name, or landmark.'
        ),
      longitude: z.number().optional().describe('Longitude for reverse geocoding'),
      latitude: z.number().optional().describe('Latitude for reverse geocoding'),
      country: z
        .string()
        .optional()
        .describe('Comma-separated ISO 3166-1 alpha-2 country codes to limit results'),
      language: z
        .string()
        .optional()
        .describe('IETF language tag for results (e.g., "en", "fr", "de")'),
      limit: z.number().optional().describe('Maximum number of results (1-10, default 5)'),
      types: z
        .string()
        .optional()
        .describe(
          'Comma-separated feature types to filter: country, region, postcode, district, place, locality, neighborhood, address, poi'
        ),
      proximity: z
        .string()
        .optional()
        .describe('Bias results toward this location as "longitude,latitude"'),
      bbox: z
        .string()
        .optional()
        .describe('Bounding box to limit results as "minLon,minLat,maxLon,maxLat"'),
      autocomplete: z
        .boolean()
        .optional()
        .describe('Enable autocomplete for partial queries (forward mode only)'),
      fuzzyMatch: z
        .boolean()
        .optional()
        .describe('Enable fuzzy matching for approximate results')
    })
  )
  .output(
    z.object({
      features: z.array(geocodeFeatureSchema).describe('Geocoding results'),
      attribution: z.string().optional().describe('Attribution text'),
      query: z.any().optional().describe('Original query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result: any;

    if (ctx.input.mode === 'forward') {
      if (!ctx.input.searchText) {
        throw new Error('searchText is required for forward geocoding');
      }
      result = await client.forwardGeocode(ctx.input.searchText, {
        country: ctx.input.country,
        language: ctx.input.language,
        limit: ctx.input.limit,
        types: ctx.input.types,
        proximity: ctx.input.proximity,
        bbox: ctx.input.bbox,
        autocomplete: ctx.input.autocomplete,
        fuzzyMatch: ctx.input.fuzzyMatch
      });
    } else {
      if (ctx.input.longitude === undefined || ctx.input.latitude === undefined) {
        throw new Error('longitude and latitude are required for reverse geocoding');
      }
      result = await client.reverseGeocode(ctx.input.longitude, ctx.input.latitude, {
        country: ctx.input.country,
        language: ctx.input.language,
        limit: ctx.input.limit,
        types: ctx.input.types
      });
    }

    let features = (result.features || []).map((f: any) => ({
      placeName: f.place_name,
      text: f.text,
      center: f.center,
      placeType: f.place_type,
      relevance: f.relevance,
      bbox: f.bbox,
      context: f.context?.map((c: any) => ({
        id: c.id,
        text: c.text,
        shortCode: c.short_code
      })),
      properties: f.properties
    }));

    let count = features.length;
    let modeLabel =
      ctx.input.mode === 'forward'
        ? `"${ctx.input.searchText}"`
        : `[${ctx.input.longitude}, ${ctx.input.latitude}]`;

    return {
      output: {
        features,
        attribution: result.attribution,
        query: result.query
      },
      message: `Found **${count}** result${count !== 1 ? 's' : ''} for ${ctx.input.mode} geocoding of ${modeLabel}.`
    };
  });
