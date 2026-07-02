import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacekeyClient } from '../lib/client';
import { spec } from '../spec';

let optionalFieldEnum = z.enum([
  'address_placekey',
  'building_placekey',
  'confidence_score',
  'normalized_address',
  'geocode',
  'upi',
  'parcel',
  'geoid',
  'gers'
]);

let placeMetadataSchema = z
  .object({
    storeId: z.string().optional().describe('Store or location identifier'),
    phoneNumber: z.string().optional().describe('Phone number of the place'),
    website: z.string().optional().describe('Website URL of the place'),
    naicsCode: z.string().optional().describe('NAICS industry code'),
    mccCode: z.string().optional().describe('Merchant Category Code')
  })
  .optional()
  .describe('Optional metadata for disambiguation');

export let lookupPlacekey = SlateTool.create(spec, {
  name: 'Lookup Placekey',
  key: 'lookup_placekey',
  description: `Look up a unique Placekey identifier for a single physical location. Locations can be specified by address, coordinates, or place name (POI). Providing more input parameters yields a more precise match. Optionally request additional fields like confidence scores, normalized addresses, geocodes, parcel identifiers, and more.`,
  instructions: [
    'Provide at least coordinates (latitude/longitude) or an address (street address, city, region, postal code, country code) to get a result.',
    'Include a location name to get a POI-specific Placekey that identifies the specific business or place at that location.',
    'Use the fields parameter to request additional data like geocodes, confidence scores, or normalized addresses.'
  ],
  constraints: ['Rate limited to 1000 requests per 60 seconds.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().optional().describe('Latitude of the location'),
      longitude: z.number().optional().describe('Longitude of the location'),
      locationName: z
        .string()
        .optional()
        .describe(
          'Name of the place or business (POI). Including this produces a POI-specific Placekey.'
        ),
      streetAddress: z.string().optional().describe('Street address of the location'),
      city: z.string().optional().describe('City name'),
      region: z.string().optional().describe('State, province, or region code'),
      postalCode: z.string().optional().describe('ZIP or postal code'),
      isoCountryCode: z
        .string()
        .optional()
        .describe('Two-letter ISO country code (e.g. "US", "GB")'),
      placeMetadata: placeMetadataSchema,
      fields: z
        .array(optionalFieldEnum)
        .optional()
        .describe('Additional response fields to include')
    })
  )
  .output(
    z.object({
      placekey: z.string().describe('The Placekey identifier for the location'),
      queryId: z.string().describe('The query identifier'),
      addressPlacekey: z
        .string()
        .optional()
        .describe('Placekey without the location name component'),
      buildingPlacekey: z
        .string()
        .optional()
        .describe('Placekey for the building without suite/apartment number'),
      confidenceScore: z
        .number()
        .optional()
        .describe('Confidence level of the Placekey match (0-1)'),
      normalizedAddress: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Structured, standardized representation of the address'),
      geocode: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Geographic coordinates and geocoding details'),
      upi: z.string().optional().describe('Universal Parcel Identifier (RESO standard)'),
      parcel: z.string().optional().describe('Land parcel identifier from local government'),
      geoid: z.string().optional().describe('Geographic identifier for census areas'),
      gers: z
        .string()
        .optional()
        .describe('Global Entity Reference System identifier (Overture Maps)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacekeyClient({ token: ctx.auth.token });

    let result = await client.lookupPlacekey(
      {
        latitude: ctx.input.latitude,
        longitude: ctx.input.longitude,
        locationName: ctx.input.locationName,
        streetAddress: ctx.input.streetAddress,
        city: ctx.input.city,
        region: ctx.input.region,
        postalCode: ctx.input.postalCode,
        isoCountryCode: ctx.input.isoCountryCode,
        placeMetadata: ctx.input.placeMetadata
      },
      ctx.input.fields
    );

    if (result.error) {
      ctx.warn(`Placekey lookup returned an error: ${result.error}`);
    }

    let locationDesc =
      ctx.input.locationName ??
      ctx.input.streetAddress ??
      (ctx.input.latitude !== undefined && ctx.input.longitude !== undefined
        ? `(${ctx.input.latitude}, ${ctx.input.longitude})`
        : 'the specified location');

    return {
      output: result,
      message: result.placekey
        ? `Found Placekey **${result.placekey}** for ${locationDesc}.`
        : `No Placekey found for ${locationDesc}.${result.error ? ` Error: ${result.error}` : ''}`
    };
  })
  .build();
