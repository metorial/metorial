import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let geocodeAddress = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Converts a street address, city, ZIP code, or intersection into geographic coordinates (latitude/longitude). Supports US, Canadian, and Mexican addresses. Can also append enrichment data like census info, congressional districts, timezones, and more via the **fields** parameter.

Provide the address either as a single string or as individual components (street, city, state, postalCode).`,
  instructions: [
    'Provide either a full address string OR individual address components, not both.',
    'Use the country parameter to force lookup in a specific country when the address is ambiguous.'
  ],
  constraints: [
    'Returns up to 100 results per query by default. Use the limit parameter to restrict.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z
        .string()
        .optional()
        .describe(
          'Full address as a single string, e.g. "1109 N Highland St, Arlington, VA 22201"'
        ),
      street: z.string().optional().describe('Street address component'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('State or province'),
      postalCode: z.string().optional().describe('ZIP or postal code'),
      country: z
        .string()
        .optional()
        .describe('Country code to force lookup: "US", "CA", or "MX"'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Data enrichment fields to append, e.g. ["timezone", "census", "cd"]'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      formattedAddress: z
        .string()
        .optional()
        .describe('Input address as parsed and formatted by Geocodio'),
      results: z
        .array(
          z.object({
            formattedAddress: z.string().describe('Standardized full address'),
            location: z.object({
              lat: z.number().describe('Latitude'),
              lng: z.number().describe('Longitude')
            }),
            accuracy: z.number().describe('Accuracy score from 0 to 1'),
            accuracyType: z
              .string()
              .describe('Type of accuracy match, e.g. "rooftop", "range_interpolation"'),
            source: z.string().describe('Data source used for this result'),
            stableAddressKey: z
              .string()
              .optional()
              .describe('Persistent identifier for deduplication and re-fetching'),
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
        .describe('Geocoding results ranked by accuracy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.geocodeForward({
      address: ctx.input.address,
      street: ctx.input.street,
      city: ctx.input.city,
      state: ctx.input.state,
      postalCode: ctx.input.postalCode,
      country: ctx.input.country,
      fields: ctx.input.fields,
      limit: ctx.input.limit
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
    let addressDisplay =
      ctx.input.address ||
      [ctx.input.street, ctx.input.city, ctx.input.state, ctx.input.postalCode]
        .filter(Boolean)
        .join(', ');

    return {
      output: {
        formattedAddress: response.input?.formatted_address,
        results
      },
      message: topResult
        ? `Geocoded **${addressDisplay}** to **${topResult.location.lat}, ${topResult.location.lng}** (${topResult.accuracyType}, accuracy: ${topResult.accuracy}). ${results.length} result(s) returned.`
        : `No results found for **${addressDisplay}**.`
    };
  })
  .build();
