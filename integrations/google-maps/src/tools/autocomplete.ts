import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let locationBiasCircleSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Circle center latitude'),
  longitude: z.number().min(-180).max(180).describe('Circle center longitude'),
  radiusMeters: z
    .number()
    .nonnegative()
    .max(50000)
    .describe('Circle radius in meters, up to 50000')
});

let locationRestrictionCircleSchema = locationBiasCircleSchema.extend({
  radiusMeters: z
    .number()
    .positive()
    .max(50000)
    .describe('Restriction circle radius in meters, greater than 0 and up to 50000')
});

let latLngSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude'),
  longitude: z.number().min(-180).max(180).describe('Longitude')
});

let sessionTokenSchema = z
  .string()
  .trim()
  .min(1)
  .max(36)
  .regex(/^[A-Za-z0-9_-]+$/)
  .describe(
    'URL-safe session token, at most 36 characters. Reuse it for one typing session and the selected Place Details request; UUID v4 is recommended.'
  );

let suggestionSchema = z.object({
  kind: z.enum(['place', 'query']).describe('Whether this is a place or query prediction'),
  text: z.string().describe('Complete human-readable prediction text'),
  mainText: z.string().optional().describe('Primary place name or query text'),
  secondaryText: z.string().optional().describe('Location or other disambiguating text'),
  placeId: z.string().optional().describe('Google place ID for a place prediction'),
  placeResourceName: z
    .string()
    .optional()
    .describe('Places API resource name for a place prediction'),
  types: z.array(z.string()).optional().describe('Place types for a place prediction'),
  distanceMeters: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Straight-line distance from origin when Google provides it')
});

type RawPrediction = {
  place?: unknown;
  placeId?: unknown;
  text?: { text?: unknown };
  structuredFormat?: {
    mainText?: { text?: unknown };
    secondaryText?: { text?: unknown };
  };
  types?: unknown;
  distanceMeters?: unknown;
};

let mapPrediction = (kind: 'place' | 'query', prediction: RawPrediction) => {
  let text = prediction.text?.text;
  if (typeof text !== 'string' || text.length === 0) return undefined;

  let mainText = prediction.structuredFormat?.mainText?.text;
  let secondaryText = prediction.structuredFormat?.secondaryText?.text;
  let output = {
    kind,
    text,
    mainText: typeof mainText === 'string' ? mainText : undefined,
    secondaryText: typeof secondaryText === 'string' ? secondaryText : undefined,
    placeId:
      kind === 'place' && typeof prediction.placeId === 'string'
        ? prediction.placeId
        : undefined,
    placeResourceName:
      kind === 'place' && typeof prediction.place === 'string' ? prediction.place : undefined,
    types:
      kind === 'place' &&
      Array.isArray(prediction.types) &&
      prediction.types.every(value => typeof value === 'string')
        ? (prediction.types as string[])
        : undefined,
    distanceMeters:
      kind === 'place' &&
      typeof prediction.distanceMeters === 'number' &&
      Number.isInteger(prediction.distanceMeters) &&
      prediction.distanceMeters >= 0
        ? prediction.distanceMeters
        : undefined
  };

  return output;
};

export let autocompleteTool = SlateTool.create(spec, {
  name: 'Autocomplete Places',
  key: 'autocomplete',
  description:
    'Return Places API (New) place predictions and optional query predictions for partial user input, with session, type, region, and circular location controls.',
  instructions: [
    'Generate one UUID v4 sessionToken when a user starts typing and reuse it for every autocomplete request in that session.',
    'When the user selects a place prediction, pass its placeId and the same sessionToken to get_place_details to conclude the billing session.',
    'Use locationBias to prefer nearby results or locationRestriction to exclude results outside the circle; do not provide both.'
  ],
  constraints: [
    'Autocomplete returns at most five ordered suggestions from Google.',
    'Applications that display predictions must follow Google Maps attribution and logo requirements.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      input: z
        .string()
        .trim()
        .min(1)
        .describe('Partial place name, address, plus code, or other text to complete'),
      sessionToken: sessionTokenSchema.optional(),
      locationBias: locationBiasCircleSchema
        .optional()
        .describe('Circle that biases ranking but can allow results outside it'),
      locationRestriction: locationRestrictionCircleSchema
        .optional()
        .describe('Circle that excludes results outside it'),
      includedPrimaryTypes: z
        .array(z.string().trim().min(1))
        .max(5)
        .optional()
        .describe('Up to five primary place types, or only (regions) or only (cities)'),
      includedRegionCodes: z
        .array(
          z
            .string()
            .trim()
            .regex(/^[A-Za-z]{2}$/)
        )
        .max(15)
        .optional()
        .describe('Up to 15 two-letter CLDR region codes that restrict results'),
      languageCode: z.string().trim().min(1).optional().describe('Preferred BCP-47 language'),
      regionCode: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}$/)
        .optional()
        .describe('Two-letter CLDR region code for formatting and ranking'),
      origin: latLngSchema
        .optional()
        .describe('Origin used to request distanceMeters for place predictions'),
      inputOffset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Zero-based Unicode cursor offset within input; defaults to input length'),
      includeQueryPredictions: z
        .boolean()
        .optional()
        .describe('Also return search-query predictions'),
      includePureServiceAreaBusinesses: z
        .boolean()
        .optional()
        .describe('Include businesses that serve customers without a physical storefront'),
      includeFutureOpeningBusinesses: z
        .boolean()
        .optional()
        .describe('Include businesses that Google expects to open in the future')
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema).describe('Suggestions ordered by relevance'),
      totalCount: z.number().int().nonnegative().describe('Number of returned suggestions')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.locationBias && ctx.input.locationRestriction) {
      throw createApiServiceError(
        'Provide either locationBias or locationRestriction, not both.',
        { reason: 'google_maps_autocomplete_location_conflict' }
      );
    }

    let primaryTypes = ctx.input.includedPrimaryTypes ?? [];
    let specialPrimaryTypes = primaryTypes.filter(
      value => value === '(cities)' || value === '(regions)'
    );
    if (specialPrimaryTypes.length > 0 && primaryTypes.length !== 1) {
      throw createApiServiceError(
        'Use (cities) or (regions) by itself in includedPrimaryTypes; neither can be combined with another type.',
        { reason: 'google_maps_autocomplete_primary_types_conflict' }
      );
    }

    if (
      ctx.input.includeQueryPredictions &&
      (ctx.input.includedRegionCodes?.length ?? 0) > 0
    ) {
      throw createApiServiceError(
        'Remove includedRegionCodes when requesting query predictions; Google does not return query predictions with region restrictions.',
        { reason: 'google_maps_autocomplete_query_region_conflict' }
      );
    }

    let inputLength = Array.from(ctx.input.input).length;
    if (ctx.input.inputOffset !== undefined && ctx.input.inputOffset > inputLength) {
      throw createApiServiceError(
        `inputOffset must be between 0 and the ${inputLength}-character input length.`,
        { reason: 'google_maps_autocomplete_input_offset_invalid' }
      );
    }

    let client = new GoogleMapsClient({ token: ctx.auth.token });
    let response = await client.autocompletePlaces({
      input: ctx.input.input,
      sessionToken: ctx.input.sessionToken,
      includedPrimaryTypes: ctx.input.includedPrimaryTypes,
      includedRegionCodes: ctx.input.includedRegionCodes,
      languageCode: ctx.input.languageCode,
      regionCode: ctx.input.regionCode,
      inputOffset: ctx.input.inputOffset,
      includeQueryPredictions: ctx.input.includeQueryPredictions,
      includePureServiceAreaBusinesses: ctx.input.includePureServiceAreaBusinesses,
      includeFutureOpeningBusinesses: ctx.input.includeFutureOpeningBusinesses,
      locationBias: ctx.input.locationBias,
      locationRestriction: ctx.input.locationRestriction,
      origin: ctx.input.origin
    });

    let rawSuggestions: Array<{
      placePrediction?: RawPrediction;
      queryPrediction?: RawPrediction;
    }> = Array.isArray(response?.suggestions) ? response.suggestions : [];
    let suggestions = rawSuggestions
      .map(suggestion => {
        if (suggestion?.placePrediction) {
          return mapPrediction('place', suggestion.placePrediction);
        }
        if (suggestion?.queryPrediction) {
          return mapPrediction('query', suggestion.queryPrediction);
        }
        return undefined;
      })
      .filter(value => value !== undefined);

    return {
      output: { suggestions, totalCount: suggestions.length },
      message: `Found **${suggestions.length}** autocomplete suggestion(s) for **${ctx.input.input}**.`
    };
  })
  .build();
