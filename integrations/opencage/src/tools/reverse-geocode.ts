import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapGeocodeResult } from '../lib/mappers';
import { geocodeResultSchema } from '../lib/schemas';
import { spec } from '../spec';

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert geographic coordinates (latitude/longitude) into a human-readable address and place name.
Returns the formatted address, address components, confidence score, and optional annotations (timezone, currency, sun times, road info, etc.).
Coordinates must use WGS 84 (EPSG:4326) in decimal format.`,
  instructions: [
    'Provide latitude and longitude in decimal degrees (WGS 84).',
    'Use roadinfo to get additional road and driving information for the coordinates.'
  ],
  constraints: ['Rate limits apply based on your API plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude in decimal degrees (WGS 84), e.g., 52.5200'),
      longitude: z.number().describe('Longitude in decimal degrees (WGS 84), e.g., 13.4050'),
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
      noRecord: z
        .boolean()
        .optional()
        .describe('Prevent OpenCage from keeping a record of the query content'),
      roadinfo: z
        .boolean()
        .optional()
        .describe('Include road and driving information in results')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of results found'),
      results: z.array(geocodeResultSchema).describe('Reverse geocoding results'),
      rateLimit: z.number().optional().describe('API rate limit for your key'),
      rateRemaining: z.number().optional().describe('Remaining API requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.reverseGeocode({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      language: ctx.input.language,
      limit: ctx.input.limit,
      minConfidence: ctx.input.minConfidence,
      noAnnotations: ctx.input.noAnnotations,
      noRecord: ctx.input.noRecord,
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
      ? `Found **${response.total_results}** result(s) for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}). Top result: **${topResult.formatted}**, confidence: ${topResult.confidence}/10.`
      : `No results found for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}).`;

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
