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

let placeQuerySchema = z.object({
  latitude: z.number().optional().describe('Latitude of the location'),
  longitude: z.number().optional().describe('Longitude of the location'),
  locationName: z.string().optional().describe('Name of the place or business (POI)'),
  streetAddress: z.string().optional().describe('Street address of the location'),
  city: z.string().optional().describe('City name'),
  region: z.string().optional().describe('State, province, or region code'),
  postalCode: z.string().optional().describe('ZIP or postal code'),
  isoCountryCode: z.string().optional().describe('Two-letter ISO country code (e.g. "US")'),
  queryId: z
    .string()
    .optional()
    .describe(
      'Custom identifier to correlate results with queries. Auto-generated if not provided.'
    ),
  placeMetadata: placeMetadataSchema
});

let resultSchema = z.object({
  placekey: z.string().describe('The Placekey identifier for the location'),
  queryId: z.string().describe('The query identifier to correlate with the input query'),
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
    .describe(
      'Numeric confidence score when provided; categorical confidence is returned as confidenceLevel'
    ),
  confidenceLevel: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .describe('Match confidence returned by the current API'),
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
    .describe(
      'Global Entity Reference System identifier (Overture Maps), omitted when unavailable'
    ),
  error: z.string().optional().describe('Error message if the lookup failed for this query')
});

export let bulkLookupPlacekeys = SlateTool.create(spec, {
  name: 'Bulk Lookup Placekeys',
  key: 'bulk_lookup_placekeys',
  description: `Look up Placekey identifiers for multiple locations in a single batch request using addresses or coordinates. Add place names to addresses to match specific points of interest. Use custom query IDs to correlate results with your input data. Optionally request confidence levels, normalized addresses, and geocodes.`,
  instructions: [
    'All supplied country codes in a batch must be the same. Coordinate-only queries may omit a country code.',
    'Use a unique queryId on each query to correlate results back to your input data.',
    'Each query needs latitude and longitude, or a street address, region, country code, and either city or postal code.',
    'For more than 100 locations, split into multiple batches of up to 100 each. Each geocode consumes an additional lookup.'
  ],
  constraints: [
    'Maximum batch size is 100 queries per request.',
    'All country codes supplied in a single batch must be the same.',
    'Rate limited to 100 requests per 60 seconds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      queries: z
        .array(placeQuerySchema)
        .min(1)
        .max(100)
        .describe('Array of location queries (max 100 per batch)'),
      fields: z
        .array(optionalFieldEnum)
        .optional()
        .describe('Additional response fields to include for all queries')
    })
  )
  .output(
    z.object({
      results: z
        .array(resultSchema)
        .describe('Array of Placekey results corresponding to the input queries'),
      totalQueried: z.number().describe('Number of locations queried'),
      totalMatched: z.number().describe('Number of locations that received a Placekey')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacekeyClient({ token: ctx.auth.token });

    let results = await client.bulkLookupPlacekeys(ctx.input.queries, ctx.input.fields);

    let totalMatched = results.filter(r => r.placekey && !r.error).length;
    let totalQueried = ctx.input.queries.length;

    return {
      output: {
        results,
        totalQueried,
        totalMatched
      },
      message: `Looked up **${totalQueried}** locations. **${totalMatched}** of **${totalQueried}** received a Placekey match.`
    };
  })
  .build();
