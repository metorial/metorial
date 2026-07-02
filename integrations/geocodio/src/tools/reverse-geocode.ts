import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Converts latitude/longitude coordinates into street addresses. Returns the closest matching addresses ranked by accuracy. Can also append enrichment data such as census info, congressional districts, timezones, and more.

Use **skipGeocoding** to only retrieve enrichment field data for coordinates without performing address lookup (reduces cost).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude coordinate'),
      longitude: z.number().describe('Longitude coordinate'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Data enrichment fields to append, e.g. ["timezone", "census", "cd"]'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      skipGeocoding: z
        .boolean()
        .optional()
        .describe('If true, skip address lookup and only return field append data')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            formattedAddress: z.string().describe('Standardized full address'),
            location: z.object({
              lat: z.number().describe('Latitude'),
              lng: z.number().describe('Longitude')
            }),
            accuracy: z.number().describe('Accuracy score from 0 to 1'),
            accuracyType: z.string().describe('Type of accuracy match'),
            source: z.string().describe('Data source used for this result'),
            stableAddressKey: z
              .string()
              .optional()
              .describe('Persistent identifier for this address'),
            addressComponents: z
              .record(z.string(), z.any())
              .optional()
              .describe('Parsed address components'),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Appended enrichment data')
          })
        )
        .describe('Reverse geocoding results ranked by accuracy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.geocodeReverse({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      skipGeocoding: ctx.input.skipGeocoding
    });

    let results = (response.results || []).map((r: any) => ({
      formattedAddress: r.formatted_address,
      location: r.location,
      accuracy: r.accuracy,
      accuracyType: r.accuracy_type,
      source: r.source,
      stableAddressKey: r.stable_address_key,
      addressComponents: r.address_components,
      fields: r.fields
    }));

    let topResult = results[0];

    return {
      output: { results },
      message: topResult
        ? `Reverse geocoded **${ctx.input.latitude}, ${ctx.input.longitude}** to **${topResult.formattedAddress}** (${topResult.accuracyType}). ${results.length} result(s) returned.`
        : `No results found for coordinates **${ctx.input.latitude}, ${ctx.input.longitude}**.`
    };
  })
  .build();
