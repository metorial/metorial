import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

let geocodeResultSchema = z.object({
  placeId: z.string().optional().describe('Unique place identifier'),
  formatted: z.string().optional().describe('Full formatted address'),
  addressLine1: z.string().optional().describe('First address line (e.g. street and number)'),
  addressLine2: z
    .string()
    .optional()
    .describe('Second address line (e.g. city, state, country)'),
  lat: z.number().describe('Latitude'),
  lon: z.number().describe('Longitude'),
  housenumber: z.string().optional().describe('House number'),
  street: z.string().optional().describe('Street name'),
  city: z.string().optional().describe('City name'),
  county: z.string().optional().describe('County name'),
  state: z.string().optional().describe('State or region name'),
  postcode: z.string().optional().describe('Postal code'),
  country: z.string().optional().describe('Country name'),
  countryCode: z.string().optional().describe('ISO country code'),
  resultType: z.string().optional().describe('Type of result (building, street, city, etc.)'),
  confidence: z.number().optional().describe('Overall confidence score (0-1)'),
  confidenceCityLevel: z.number().optional().describe('City-level confidence score (0-1)'),
  confidenceStreetLevel: z.number().optional().describe('Street-level confidence score (0-1)'),
  matchType: z.string().optional().describe('Match type (full_match, inner_part, etc.)')
});

export let geocodeAddress = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Convert a text address or structured address components into geographic coordinates (latitude/longitude). Supports free-form text queries like "1600 Pennsylvania Ave, Washington DC" or structured components (street, city, state, country). Results include confidence scores to verify correctness. Use **filter** and **bias** parameters to constrain or prioritize results geographically.`,
  instructions: [
    'Provide either a free-form text address OR structured address components (street, city, etc.) — not both.',
    'Use filter for hard geographic constraints (e.g., filter by country or bounding box). Use bias for soft proximity preferences.',
    'Filter syntax: "countrycode:us", "circle:lon,lat,radiusMeters", "rect:west,south,east,north". Combine with pipe (|).',
    'Bias syntax: "proximity:lon,lat", "countrycode:us". Combine with pipe (|).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().optional().describe('Free-form address text to geocode'),
      name: z.string().optional().describe('Place or amenity name (for structured search)'),
      housenumber: z.string().optional().describe('House number (for structured search)'),
      street: z.string().optional().describe('Street name (for structured search)'),
      postcode: z.string().optional().describe('Postal code (for structured search)'),
      city: z.string().optional().describe('City name (for structured search)'),
      state: z.string().optional().describe('State or region (for structured search)'),
      country: z.string().optional().describe('Country name (for structured search)'),
      type: z
        .enum(['country', 'state', 'city', 'postcode', 'street', 'amenity'])
        .optional()
        .describe('Filter results by location type'),
      lang: z
        .string()
        .optional()
        .describe('ISO 639-1 language code for results (e.g. "en", "de", "fr")'),
      limit: z.number().optional().describe('Maximum number of results (default: 5)'),
      filter: z
        .string()
        .optional()
        .describe(
          'Geographic filter constraint (e.g. "countrycode:us", "circle:lon,lat,radius")'
        ),
      bias: z
        .string()
        .optional()
        .describe('Geographic proximity bias (e.g. "proximity:lon,lat", "countrycode:us")')
    })
  )
  .output(
    z.object({
      results: z.array(geocodeResultSchema).describe('Geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.geocodeForward({
      text: ctx.input.text,
      name: ctx.input.name,
      housenumber: ctx.input.housenumber,
      street: ctx.input.street,
      postcode: ctx.input.postcode,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      type: ctx.input.type,
      lang: ctx.input.lang,
      limit: ctx.input.limit,
      filter: ctx.input.filter,
      bias: ctx.input.bias
    });

    let results = (data.results || []).map((r: any) => ({
      placeId: r.place_id,
      formatted: r.formatted,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      lat: r.lat,
      lon: r.lon,
      housenumber: r.housenumber,
      street: r.street,
      city: r.city,
      county: r.county,
      state: r.state,
      postcode: r.postcode,
      country: r.country,
      countryCode: r.country_code,
      resultType: r.result_type,
      confidence: r.rank?.confidence,
      confidenceCityLevel: r.rank?.confidence_city_level,
      confidenceStreetLevel: r.rank?.confidence_street_level,
      matchType: r.rank?.match_type
    }));

    let count = results.length;
    let firstResult = count > 0 ? results[0].formatted : 'no results';
    return {
      output: { results },
      message: `Found **${count}** result(s). Top result: ${firstResult}`
    };
  })
  .build();
