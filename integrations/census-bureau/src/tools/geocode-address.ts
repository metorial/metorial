import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GeocoderClient } from '../lib/client';
import { spec } from '../spec';

let matchedAddressSchema = z.object({
  matchedAddress: z.string().optional().describe('Standardized matched address'),
  coordinates: z
    .object({
      longitude: z.number().describe('Longitude coordinate'),
      latitude: z.number().describe('Latitude coordinate')
    })
    .optional()
    .describe('Geographic coordinates of the matched address'),
  tigerLine: z
    .object({
      tigerLineId: z.string().optional().describe('TIGER/Line ID'),
      side: z.string().optional().describe('Side of the street (L or R)')
    })
    .optional()
    .describe('TIGER/Line segment information'),
  addressComponents: z
    .object({
      fromAddress: z.string().optional(),
      toAddress: z.string().optional(),
      preQualifier: z.string().optional(),
      preDirection: z.string().optional(),
      preType: z.string().optional(),
      streetName: z.string().optional(),
      suffixType: z.string().optional(),
      suffixDirection: z.string().optional(),
      suffixQualifier: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional()
    })
    .optional()
    .describe('Parsed address components'),
  geographies: z
    .record(z.string(), z.array(z.record(z.string(), z.any())))
    .optional()
    .describe('Census geographies the address falls within (states, counties, tracts, etc.)')
});

export let geocodeAddress = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Convert a street address to geographic coordinates (latitude/longitude) and optionally identify which Census geographic areas it falls within (state, county, tract, block group, etc.).

Supports structured address input (street, city, state, zip) or a single-line address string. Coordinates can identify containing Census geographies; coordinate lookup does not return a street address.`,
  instructions: [
    'Provide either a `street` address (with optional city/state/zip) or a single `address` string, or coordinates for reverse geocoding.',
    'Set `includeGeographies` to true to get Census geography identifiers (FIPS codes) for the address.',
    'Structured addresses require a street and ZIP code, or a street, city, and state.',
    'The default benchmark is "Public_AR_Current". Use Get Geocoder Options to discover benchmarks and their compatible geography vintages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      street: z.string().optional().describe('Street address (e.g., "4600 Silver Hill Rd")'),
      city: z.string().optional().describe('City name (e.g., "Washington")'),
      state: z.string().optional().describe('State name or abbreviation (e.g., "DC")'),
      zip: z.string().optional().describe('ZIP code (e.g., "20233")'),
      address: z
        .string()
        .optional()
        .describe(
          'Single-line full address (alternative to structured input, e.g., "4600 Silver Hill Rd, Washington, DC 20233")'
        ),
      longitude: z.number().optional().describe('Longitude for Census geography lookup'),
      latitude: z.number().optional().describe('Latitude for Census geography lookup'),
      includeGeographies: z
        .boolean()
        .optional()
        .describe('Set to true to include Census geographies (FIPS codes) in the response'),
      benchmark: z
        .string()
        .optional()
        .describe('Address benchmark to use (default: "Public_AR_Current")'),
      vintage: z
        .string()
        .optional()
        .describe(
          "Geography vintage for address geographies or coordinate lookup. Defaults to Current_Current for the current benchmark, or the selected benchmark's default vintage."
        )
    })
  )
  .output(
    z.object({
      matches: z
        .array(matchedAddressSchema)
        .describe('List of matched addresses with coordinates and optionally geographies'),
      inputAddress: z
        .string()
        .describe('The input address or coordinates as interpreted by the geocoder')
    })
  )
  .handleInvocation(async ctx => {
    let geocoder = new GeocoderClient();
    let returnType = ctx.input.includeGeographies
      ? ('geographies' as const)
      : ('locations' as const);
    let result: Awaited<ReturnType<GeocoderClient['geocodeAddress']>>;
    let hasLongitude = ctx.input.longitude !== undefined;
    let hasLatitude = ctx.input.latitude !== undefined;
    if (hasLongitude !== hasLatitude) {
      throw createApiServiceError(
        'Provide both longitude and latitude for coordinate lookup.'
      );
    }
    if (
      (ctx.input.longitude !== undefined &&
        (!Number.isFinite(ctx.input.longitude) || Math.abs(ctx.input.longitude) > 180)) ||
      (ctx.input.latitude !== undefined &&
        (!Number.isFinite(ctx.input.latitude) || Math.abs(ctx.input.latitude) > 90))
    ) {
      throw createApiServiceError(
        'Longitude must be between -180 and 180, and latitude between -90 and 90.'
      );
    }

    if (ctx.input.longitude !== undefined && ctx.input.latitude !== undefined) {
      result = await geocoder.reverseGeocode({
        longitude: ctx.input.longitude,
        latitude: ctx.input.latitude,
        benchmark: ctx.input.benchmark,
        vintage: ctx.input.vintage
      });
    } else if (ctx.input.address) {
      result = await geocoder.geocodeOneLineAddress({
        address: ctx.input.address,
        benchmark: ctx.input.benchmark,
        vintage: ctx.input.vintage,
        returnType
      });
    } else if (ctx.input.street) {
      result = await geocoder.geocodeAddress({
        street: ctx.input.street,
        city: ctx.input.city,
        state: ctx.input.state,
        zip: ctx.input.zip,
        benchmark: ctx.input.benchmark,
        vintage: ctx.input.vintage,
        returnType
      });
    } else {
      throw createApiServiceError(
        'Please provide either a street address, a single-line address, or longitude/latitude coordinates.'
      );
    }

    let addressMatches = result.addressMatches || [];
    let location = result.input?.location;
    let providerAddress = result.input?.address;
    let inputAddress =
      providerAddress?.address ||
      (providerAddress
        ? [
            providerAddress.street,
            providerAddress.city,
            providerAddress.state,
            providerAddress.zip
          ]
            .filter(Boolean)
            .join(', ')
        : '') ||
      (location
        ? `${location.y}, ${location.x}`
        : ctx.input.address || ctx.input.street || '');

    let matches = addressMatches.map(match => ({
      matchedAddress: match.matchedAddress || undefined,
      coordinates: match.coordinates
        ? {
            longitude: match.coordinates.x,
            latitude: match.coordinates.y
          }
        : undefined,
      tigerLine: match.tigerLine
        ? {
            tigerLineId: match.tigerLine.tigerLineId,
            side: match.tigerLine.side
          }
        : undefined,
      addressComponents: match.addressComponents,
      geographies: match.geographies || undefined
    }));
    if (ctx.input.longitude !== undefined && ctx.input.latitude !== undefined) {
      matches.push({
        matchedAddress: undefined,
        coordinates: { longitude: ctx.input.longitude, latitude: ctx.input.latitude },
        tigerLine: undefined,
        addressComponents: undefined,
        geographies: ctx.input.includeGeographies === false ? undefined : result.geographies
      });
      if (!inputAddress) inputAddress = `${ctx.input.latitude}, ${ctx.input.longitude}`;
    }

    return {
      output: {
        matches,
        inputAddress: inputAddress.toString()
      },
      message: hasLongitude
        ? 'Retrieved Census geography lookup for the provided coordinates.'
        : matches.length > 0
          ? `Found **${matches.length}** match(es) for the address. ${matches[0]?.matchedAddress ? `Best match: ${matches[0].matchedAddress}` : ''}`
          : 'No matches found for the provided address.'
    };
  })
  .build();
