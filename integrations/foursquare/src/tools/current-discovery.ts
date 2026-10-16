import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlacesClient } from '../lib/places-client';
import {
  coordinateFields,
  coordinates,
  currentPlaceId,
  currentPlaceSchema,
  integerRange,
  validateBounds
} from '../lib/places-schemas';
import { spec } from '../spec';

let instructions = [
  'Requires the Places Service API Key connection. Uses current fsq_place_id identifiers and returns the complete provider response.'
];
let placesOutput = z.object({
  places: z.array(currentPlaceSchema),
  response: z.unknown().describe('Complete unmodified provider response'),
  requestId: z.string().optional().describe('Provider request ID, when returned')
});

export let searchPlacesCurrent = SlateTool.create(spec, {
  key: 'search_places_current',
  name: 'Search Places (Current API)',
  description:
    'Search current Foursquare Places by query, geographic area, category, chain, hours, and price. Without a location the provider uses IP biasing.',
  instructions,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional(),
      ...coordinateFields,
      radius: z
        .number()
        .optional()
        .describe('Integer radius in meters, 0–100000; only with coordinates or IP biasing'),
      categoryIds: z.string().optional().describe('Comma-separated fsq_category_ids'),
      chainIds: z.string().optional().describe('Comma-separated fsq_chain_ids'),
      excludeChainIds: z
        .string()
        .optional()
        .describe(
          'Comma-separated chain IDs to exclude; cannot be combined with excludeAllChains'
        ),
      excludeAllChains: z.boolean().optional(),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated current response fields; omit for provider defaults'),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      openAt: z
        .string()
        .optional()
        .describe(
          'Local day/time in DOWTHHMM format, e.g. 1T2130; cannot be combined with openNow'
        ),
      openNow: z.boolean().optional(),
      telephoneFormat: z.enum(['NATIONAL', 'E164']).optional(),
      near: z.string().optional(),
      ne: z.string().optional().describe('Northeast latitude,longitude; provide sw too'),
      sw: z.string().optional().describe('Southwest latitude,longitude; provide ne too'),
      sort: z.enum(['RELEVANCE', 'RATING', 'DISTANCE', 'POPULARITY']).optional(),
      limit: z.number().optional().describe('Integer result limit, 1–50; provider default 10')
    })
  )
  .output(placesOutput)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let ll = coordinates(input);
    validateBounds(input);
    integerRange(input.radius, 'radius', 0, 100000);
    integerRange(input.limit, 'limit', 1, 50);
    integerRange(input.minPrice, 'minPrice', 1, 4);
    integerRange(input.maxPrice, 'maxPrice', 1, 4);
    if (
      input.minPrice !== undefined &&
      input.maxPrice !== undefined &&
      input.minPrice > input.maxPrice
    ) {
      throw createApiServiceError('minPrice cannot exceed maxPrice.');
    }
    if (input.openAt !== undefined && input.openNow !== undefined) {
      throw createApiServiceError('Use only one of openAt and openNow.');
    }
    if (input.openAt !== undefined && !/^[1-7]T(?:[01]\d|2[0-3])[0-5]\d$/.test(input.openAt)) {
      throw createApiServiceError('openAt must use local DOWTHHMM format, such as 1T2130.');
    }
    if (input.excludeChainIds !== undefined && input.excludeAllChains !== undefined) {
      throw createApiServiceError('Use only one of excludeChainIds and excludeAllChains.');
    }
    if (input.radius !== undefined && (input.near !== undefined || input.ne !== undefined)) {
      throw createApiServiceError('radius is supported only with coordinates or IP biasing.');
    }
    let { data, requestId } = await new PlacesClient(ctx.auth).request(
      'GET',
      '/places/search',
      {
        query: input.query,
        ll,
        radius: input.radius,
        fsq_category_ids: input.categoryIds,
        fsq_chain_ids: input.chainIds,
        exclude_fsq_chain_ids: input.excludeChainIds,
        exclude_all_chains: input.excludeAllChains,
        fields: input.fields,
        min_price: input.minPrice,
        max_price: input.maxPrice,
        open_at: input.openAt,
        open_now: input.openNow,
        tel_format: input.telephoneFormat,
        near: input.near,
        ne: input.ne,
        sw: input.sw,
        sort: input.sort,
        limit: input.limit
      }
    );
    let places = data.results ?? [];
    return {
      output: { places, response: data, requestId },
      message: `Found ${places.length} place(s).`
    };
  })
  .build();

export let getPlaceDetailsCurrent = SlateTool.create(spec, {
  key: 'get_place_details_current',
  name: 'Get Place Details (Current API)',
  description:
    'Retrieve the selected fields of a current Foursquare place, preserving all returned metadata.',
  instructions,
  tags: { readOnly: true }
})
  .input(z.object({ fsqPlaceId: currentPlaceId, fields: z.string().optional() }))
  .output(z.object({ place: currentPlaceSchema, response: z.unknown() }))
  .handleInvocation(async ctx => {
    let { data } = await new PlacesClient(ctx.auth).request(
      'GET',
      `/places/${encodeURIComponent(ctx.input.fsqPlaceId)}`,
      { fields: ctx.input.fields }
    );
    return { output: { place: data, response: data }, message: 'Retrieved place details.' };
  })
  .build();

export let autocompletePlacesCurrent = SlateTool.create(spec, {
  key: 'autocomplete_places_current',
  name: 'Autocomplete Places (Current API)',
  description: 'Get current place, search, and geographic suggestions as text is entered.',
  instructions,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().min(3),
      ...coordinateFields,
      radius: z
        .number()
        .optional()
        .describe('Integer bias radius in meters; provider default 5000'),
      types: z
        .string()
        .optional()
        .describe('Comma-separated result types: place, search, geo'),
      bias: z.enum(['place', 'search', 'geo']).optional(),
      limit: z.number().optional().describe('Integer result limit, 1–50; provider default 10'),
      sessionToken: z
        .string()
        .optional()
        .describe('User-generated token to group autocomplete requests for billing')
    })
  )
  .output(
    z.object({ results: z.array(z.record(z.string(), z.unknown())), response: z.unknown() })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    integerRange(input.limit, 'limit', 1, 50);
    if (input.radius !== undefined && (!Number.isInteger(input.radius) || input.radius < 0)) {
      throw createApiServiceError('radius must be a nonnegative integer.');
    }
    if (input.types?.split(',').some(type => !['place', 'search', 'geo'].includes(type))) {
      throw createApiServiceError(
        'types must be a comma-separated combination of place, search, and geo.'
      );
    }
    let { data } = await new PlacesClient(ctx.auth).request('GET', '/autocomplete', {
      query: input.query,
      ll: coordinates(input),
      radius: input.radius,
      types: input.types,
      bias: input.bias,
      limit: input.limit,
      session_token: input.sessionToken
    });
    let results = data.results ?? [];
    return {
      output: { results, response: data },
      message: `Found ${results.length} suggestion(s).`
    };
  })
  .build();

export let matchPlaceCurrent = SlateTool.create(spec, {
  key: 'match_place_current',
  name: 'Match Place (Current API)',
  description:
    'Match a place name and address to a current Foursquare place. The provider currently supports English-speaking countries.',
  instructions,
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      countryCode: z.string().length(2),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      ...coordinateFields,
      fields: z.string().optional()
    })
  )
  .output(z.object({ place: currentPlaceSchema.nullish(), response: z.unknown() }))
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let { data } = await new PlacesClient(ctx.auth).request('GET', '/places/match', {
      name: input.name,
      address: input.address,
      city: input.city,
      state: input.state,
      cc: input.countryCode,
      postal_code: input.postalCode,
      ll: coordinates(input),
      fields: input.fields
    });
    return {
      output: { place: data.place, response: data },
      message: data.place ? 'Matched place.' : 'No match returned.'
    };
  })
  .build();

export let getGeotaggingCandidates = SlateTool.create(spec, {
  key: 'get_geotagging_candidates',
  name: 'Get Geotagging Candidates',
  description:
    'Find candidates for tagging a device location. Results may include lower-quality places omitted from normal search.',
  instructions: [
    ...instructions,
    'Use the returned requestId with confirm_geotagging_selection after the user selects a candidate.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...coordinateFields,
      hacc: z.number().optional(),
      altitude: z.number().optional(),
      query: z.string().optional(),
      limit: z.number().optional(),
      fields: z.string().optional()
    })
  )
  .output(placesOutput)
  .handleInvocation(async ctx => {
    integerRange(ctx.input.limit, 'limit', 1, 50);
    let { latitude, longitude, ...params } = ctx.input;
    let { data, requestId } = await new PlacesClient(ctx.auth).request(
      'GET',
      '/geotagging/candidates',
      { ...params, ll: coordinates({ latitude, longitude }) }
    );
    let places = data.candidates ?? [];
    return {
      output: { places, response: data, requestId },
      message: `Found ${places.length} candidate(s).`
    };
  })
  .build();

export let confirmGeotaggingSelection = SlateTool.create(spec, {
  key: 'confirm_geotagging_selection',
  name: 'Confirm Geotagging Selection',
  description: 'Report which candidate the user selected from a previous geotagging request.',
  instructions,
  tags: { destructive: false }
})
  .input(
    z.object({
      requestId: z.string().min(1).describe('requestId returned by get_geotagging_candidates'),
      fsqPlaceId: currentPlaceId,
      context: z.enum(['CurrentLocation', 'Nearby', 'Destination', 'Search']).optional(),
      delayed: z.boolean().optional()
    })
  )
  .output(z.object({ response: z.unknown() }))
  .handleInvocation(async ctx => {
    let { data } = await new PlacesClient(ctx.auth).request('POST', '/geotagging/confirm', {
      request_id: ctx.input.requestId,
      fsq_place_id: ctx.input.fsqPlaceId,
      confirm_context: ctx.input.context,
      delayed: ctx.input.delayed
    });
    return { output: { response: data }, message: 'Reported geotagging selection.' };
  })
  .build();
