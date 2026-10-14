import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchGeocode = SlateTool.create(spec, {
  name: 'Batch Geocode',
  key: 'batch_geocode',
  description: `Geocodes multiple addresses or coordinate pairs in a single request. Supports both forward geocoding (addresses to coordinates) and reverse geocoding (coordinates to addresses).

Set **direction** to "forward" for addresses or "reverse" for coordinates. Enrichment fields can be appended to all results.`,
  constraints: [
    'Up to 10,000 lookups per batch request.',
    'For forward geocoding, provide an array of address strings.',
    'For reverse geocoding, provide an array of "latitude,longitude" strings.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      direction: z
        .enum(['forward', 'reverse'])
        .describe(
          'Geocoding direction: "forward" for addresses to coordinates, "reverse" for coordinates to addresses'
        ),
      queries: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(10000)
        .describe(
          'Array of address strings (forward) or "latitude,longitude" strings (reverse)'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe('Data enrichment fields to append, e.g. ["timezone", "census"]'),
      limit: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger, 'Use a whole number')
        .optional()
        .describe('Maximum number of results per query; 0 means no limit')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            query: z.string().describe('The original input query'),
            matches: z
              .array(
                z.object({
                  formattedAddress: z.string().describe('Standardized full address'),
                  location: z.object({
                    lat: z.number().describe('Latitude'),
                    lng: z.number().describe('Longitude')
                  }),
                  accuracy: z.number().describe('Accuracy score'),
                  accuracyType: z.string().describe('Type of accuracy match'),
                  source: z.string().describe('Data source'),
                  stableAddressKey: z.string().optional().describe('Persistent identifier'),
                  fields: z
                    .record(z.string(), z.any())
                    .optional()
                    .describe('Appended enrichment data')
                })
              )
              .describe('Geocoding results for this query')
          })
        )
        .describe('Batch results preserving input order')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.direction === 'reverse') {
      for (let query of ctx.input.queries) {
        let parts = query.split(',');
        let [latitude, longitude] = parts.map(Number);
        if (
          parts.length !== 2 ||
          parts.some(part => !part.trim()) ||
          latitude === undefined ||
          longitude === undefined ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw createApiServiceError(
            'Reverse batch queries must contain valid "latitude,longitude" coordinate pairs.'
          );
        }
      }
    }
    let client = new Client({ token: ctx.auth.token });

    let response: any;

    if (ctx.input.direction === 'forward') {
      response = await client.batchGeocodeForward({
        addresses: ctx.input.queries,
        fields: ctx.input.fields,
        limit: ctx.input.limit
      });
    } else {
      response = await client.batchGeocodeReverse({
        coordinates: ctx.input.queries,
        fields: ctx.input.fields,
        limit: ctx.input.limit
      });
    }

    let results = (response.results || []).map((item: any) => ({
      query: item.query,
      matches: (item.response?.results || []).map((r: any) => ({
        formattedAddress: r.formatted_address,
        location: r.location,
        accuracy: r.accuracy,
        accuracyType: r.accuracy_type,
        source: r.source,
        stableAddressKey: r.stable_address_key,
        fields: r.fields
      }))
    }));

    let totalMatches = results.reduce((sum: number, r: any) => sum + r.matches.length, 0);

    return {
      output: { results },
      message: `Batch ${ctx.input.direction} geocoded **${ctx.input.queries.length}** queries. Found **${totalMatches}** total matches.`
    };
  })
  .build();
