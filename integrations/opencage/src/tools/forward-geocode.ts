import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapGeocodeResult } from '../lib/mappers';
import { geocodeResultSchema } from '../lib/schemas';
import { spec } from '../spec';

export let forwardGeocode = SlateTool.create(spec, {
  name: 'Forward Geocode',
  key: 'forward_geocode',
  description: `Convert an address, place name, or location query into geographic coordinates (latitude/longitude).
Results include the formatted address, coordinates, confidence score, address components, and optional annotations (timezone, currency, sun times, road info, etc.).
Use **countrycode** or **bounds** to narrow results to a specific region. Use **proximity** to bias results toward a location.`,
  instructions: [
    'Provide a place name, address, or location query as the input.',
    'Use countrycode with ISO 3166-1 Alpha 2 codes (e.g., "de" for Germany, "fr,be,lu" for multiple countries).',
    'Use bounds as "minLon,minLat,maxLon,maxLat" to restrict to a bounding box.',
    'Use proximity as "lat,lng" to bias results toward a specific location.'
  ],
  constraints: [
    'Maximum 100 results per request.',
    'Rate limits apply based on your API plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Address, place name, or location to geocode (e.g., "Berlin", "1600 Pennsylvania Ave NW, Washington DC")'
        ),
      countrycode: z
        .string()
        .optional()
        .describe(
          'Restrict results to specific countries using comma-separated ISO 3166-1 Alpha 2 codes (e.g., "de", "fr,be,lu")'
        ),
      bounds: z
        .string()
        .optional()
        .describe('Restrict results to a bounding box as "minLon,minLat,maxLon,maxLat"'),
      proximity: z.string().optional().describe('Bias results toward a location as "lat,lng"'),
      language: z
        .string()
        .optional()
        .describe(
          'Return results in a specific language using IETF BCP 47 tag (e.g., "en", "de", "native")'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 10, max: 100)'),
      minConfidence: z
        .number()
        .optional()
        .describe('Minimum confidence score for results (0-10)'),
      noAnnotations: z
        .boolean()
        .optional()
        .describe('Disable annotations to reduce response size'),
      noDedupe: z.boolean().optional().describe('Disable deduplication of results'),
      noRecord: z
        .boolean()
        .optional()
        .describe('Prevent OpenCage from keeping a record of the query content'),
      abbrv: z
        .boolean()
        .optional()
        .describe('Request abbreviated/shorter formatted addresses'),
      addressOnly: z.boolean().optional().describe('Return only address portion of results'),
      roadinfo: z
        .boolean()
        .optional()
        .describe('Include road and driving information in results')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of results found'),
      results: z.array(geocodeResultSchema).describe('Geocoding results'),
      rateLimit: z.number().optional().describe('API rate limit for your key'),
      rateRemaining: z.number().optional().describe('Remaining API requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.forwardGeocode({
      query: ctx.input.query,
      countrycode: ctx.input.countrycode,
      bounds: ctx.input.bounds,
      proximity: ctx.input.proximity,
      language: ctx.input.language,
      limit: ctx.input.limit,
      minConfidence: ctx.input.minConfidence,
      noAnnotations: ctx.input.noAnnotations,
      noDedupe: ctx.input.noDedupe,
      noRecord: ctx.input.noRecord,
      abbrv: ctx.input.abbrv,
      addressOnly: ctx.input.addressOnly,
      roadinfo: ctx.input.roadinfo
    });

    if (response.status.code !== 200) {
      throw new Error(
        `OpenCage API error: ${response.status.message} (code: ${response.status.code})`
      );
    }

    let results = response.results.map(mapGeocodeResult);

    let topResult = results[0];
    let summary = topResult
      ? `Found **${response.total_results}** result(s) for "${ctx.input.query}". Top result: **${topResult.formatted}** (${topResult.latitude}, ${topResult.longitude}), confidence: ${topResult.confidence}/10.`
      : `No results found for "${ctx.input.query}".`;

    return {
      output: {
        totalResults: response.total_results,
        results,
        rateLimit: response.rate?.limit,
        rateRemaining: response.rate?.remaining
      },
      message: summary
    };
  })
  .build();
