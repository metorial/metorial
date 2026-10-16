import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let currentPlaceSchema = z.looseObject({
  fsq_place_id: z.string().nullish().describe('Current Foursquare place ID'),
  name: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  location: z.record(z.string(), z.unknown()).nullish(),
  categories: z.array(z.record(z.string(), z.unknown())).nullish(),
  chains: z.array(z.record(z.string(), z.unknown())).nullish()
});

export let currentPlaceId = z
  .string()
  .min(1)
  .describe(
    'Current fsq_place_id from search_places_current, autocomplete_places_current, or match_place_current.'
  );

export let rawResponseSchema = z.object({
  response: z
    .unknown()
    .describe(
      'Complete provider response, including edit IDs, statuses, errors, and metadata when returned'
    )
});

export let coordinateFields = {
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
};

export let coordinates = (input: { latitude?: number; longitude?: number }) => {
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw createApiServiceError('Provide latitude and longitude together.');
  }
  return input.latitude !== undefined && input.longitude !== undefined
    ? `${input.latitude},${input.longitude}`
    : undefined;
};

export let integerRange = (
  value: number | undefined,
  name: string,
  min: number,
  max: number
) => {
  if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${name} must be an integer from ${min} to ${max}.`);
  }
};

export let validateBounds = (input: { ne?: string; sw?: string }) => {
  if ((input.ne === undefined) !== (input.sw === undefined)) {
    throw createApiServiceError('Provide both ne and sw to specify a bounding box.');
  }
};
