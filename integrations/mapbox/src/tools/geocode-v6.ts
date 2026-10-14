import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let geocodeV6Tool = SlateTool.create(spec, {
  name: 'Geocode V6',
  key: 'geocode_v6',
  description:
    'Find addresses and places using Mapbox Geocoding v6. Supports text or structured address searches, reverse geocoding, and detailed address match information.',
  instructions: [
    'For forward mode, provide searchText or structured address fields, never both. For structured input, set autocomplete to false.',
    'For reverse mode, provide longitude and latitude.',
    'Geocoding does not search points of interest. Results are temporary and cannot be stored or cached.',
    'A reverse limit above 1 requires exactly one feature type.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      mode: z
        .enum(['forward', 'reverse'])
        .describe('Search text or an address, or look up coordinates'),
      searchText: z
        .string()
        .optional()
        .describe('Text query for forward mode, up to 256 characters and 20 words'),
      longitude: z.number().optional().describe('Longitude for reverse mode'),
      latitude: z.number().optional().describe('Latitude for reverse mode'),
      addressNumber: z
        .string()
        .optional()
        .describe('Street number for structured forward mode'),
      street: z.string().optional().describe('Street name for structured forward mode'),
      place: z.string().optional().describe('City or town for structured forward mode'),
      region: z.string().optional().describe('State or region for structured forward mode'),
      postcode: z.string().optional().describe('Postal code for structured forward mode'),
      country: z
        .string()
        .optional()
        .describe(
          'ISO country codes to filter; a country name is also supported for structured input'
        ),
      language: z
        .string()
        .optional()
        .describe('IETF language tag or comma-separated language tags'),
      limit: z
        .number()
        .optional()
        .describe('Maximum results: 1-10 for forward, 1-5 for reverse'),
      types: z
        .string()
        .optional()
        .describe(
          'Comma-separated geographic feature types, such as address, place, or country'
        ),
      proximity: z
        .string()
        .optional()
        .describe('Bias forward results toward longitude,latitude or ip'),
      bbox: z
        .string()
        .optional()
        .describe('Forward search bounds as minLon,minLat,maxLon,maxLat'),
      autocomplete: z
        .boolean()
        .optional()
        .describe('Enable partial text matches; use false for structured addresses'),
      worldview: z
        .string()
        .optional()
        .describe('Worldview for disputed boundaries, such as us, cn, or in')
    })
  )
  .output(
    z.object({
      features: z.array(
        z.object({
          featureId: z.string().optional().describe('Stable Mapbox feature identifier'),
          featureType: z.string().optional(),
          name: z.string().optional(),
          fullAddress: z.string().optional(),
          placeFormatted: z.string().optional(),
          coordinates: z.array(z.number()).optional().describe('Longitude and latitude'),
          bbox: z.array(z.number()).optional(),
          context: z
            .record(z.string(), z.any())
            .optional()
            .describe('Address and administrative hierarchy'),
          matchCode: z
            .record(z.string(), z.any())
            .optional()
            .describe('Address component matches and confidence'),
          properties: z
            .record(z.string(), z.any())
            .optional()
            .describe('Full result properties')
        })
      ),
      attribution: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { input } = ctx;
    let structured = [
      input.addressNumber,
      input.street,
      input.place,
      input.region,
      input.postcode
    ].some(value => value !== undefined);
    if (input.mode === 'forward') {
      if (
        (!input.searchText?.trim() && !structured) ||
        (input.searchText !== undefined && structured)
      ) {
        throw createApiServiceError(
          'Forward geocoding requires searchText or structured address fields, never both.'
        );
      }
      if (
        input.searchText &&
        (input.searchText.length > 256 ||
          input.searchText.includes(';') ||
          input.searchText
            .trim()
            .split(/[\s\p{P}]+/u)
            .filter(Boolean).length > 20)
      ) {
        throw createApiServiceError(
          'searchText must contain at most 256 characters and 20 words, without semicolons.'
        );
      }
    } else {
      if (
        input.longitude === undefined ||
        input.latitude === undefined ||
        input.longitude < -180 ||
        input.longitude > 180 ||
        input.latitude < -90 ||
        input.latitude > 90
      ) {
        throw createApiServiceError(
          'Reverse geocoding requires longitude from -180 to 180 and latitude from -90 to 90.'
        );
      }
      if (
        input.limit !== undefined &&
        input.limit > 1 &&
        (!input.types?.trim() || input.types.includes(','))
      ) {
        throw createApiServiceError(
          'A reverse limit above 1 requires exactly one feature type in types.'
        );
      }
    }
    let maximum = input.mode === 'forward' ? 10 : 5;
    if (
      input.limit !== undefined &&
      (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > maximum)
    ) {
      throw createApiServiceError(
        `limit must be a whole number from 1 to ${maximum} for ${input.mode} geocoding.`
      );
    }
    let client = new MapboxClient({ token: ctx.auth.token, username: ctx.config.username });
    let result = await client.geocodeV6({
      ...input,
      autocomplete: structured ? (input.autocomplete ?? false) : input.autocomplete
    });
    let features = (result.features || []).map((feature: any) => ({
      featureId: feature.properties?.mapbox_id ?? feature.id ?? undefined,
      featureType: feature.properties?.feature_type ?? undefined,
      name: feature.properties?.name ?? undefined,
      fullAddress: feature.properties?.full_address ?? undefined,
      placeFormatted: feature.properties?.place_formatted ?? undefined,
      coordinates: feature.geometry?.coordinates ?? undefined,
      bbox: feature.bbox ?? undefined,
      context: feature.properties?.context ?? undefined,
      matchCode: feature.properties?.match_code ?? undefined,
      properties: feature.properties ?? undefined
    }));
    return {
      output: { features, attribution: result.attribution },
      message: `Found **${features.length}** ${input.mode} geocoding result${features.length === 1 ? '' : 's'}.`
    };
  });
