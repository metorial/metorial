import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  address: z.string().describe('Formatted address'),
  city: z.string().describe('City name'),
  state: z.string().describe('State/province name'),
  postalCode: z.string().describe('Postal/zip code'),
  country: z.string().describe('Country name'),
  countryCode: z.string().describe('ISO 2-letter country code'),
  locationType: z
    .string()
    .describe(
      'Location type: address, street, city, postal-code, railway, natural, island, administrative'
    ),
  buildingType: z.string().describe('Building type classification')
});

export let geocodeAddressTool = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Convert an address, partial address, or place name into geographic coordinates. Supports both unstructured and structured address input, with fuzzy search for typos. Returns multiple candidate locations ranked by relevance.`,
  constraints: ['Rate limited to 6 requests per second'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z
        .string()
        .optional()
        .describe('Full or partial address, or place name (unstructured)'),
      houseNumber: z.string().optional().describe('House/building number (structured input)'),
      street: z.string().optional().describe('Street name (structured input)'),
      city: z.string().optional().describe('City name (structured input)'),
      county: z.string().optional().describe('County name (structured input)'),
      state: z.string().optional().describe('State/province name (structured input)'),
      postalCode: z.string().optional().describe('Postal/zip code (structured input)'),
      countryCode: z.string().optional().describe('ISO 2-letter country code to bias results'),
      languageCode: z
        .string()
        .optional()
        .describe('Language for results: ar, de, en, es, fr, it, ja, nl, pt, ru, zh'),
      fuzzySearch: z
        .boolean()
        .optional()
        .describe('Enable fuzzy matching for typos and incomplete input'),
      limit: z.number().optional().describe('Maximum number of results (1-32, default 8)')
    })
  )
  .output(
    z.object({
      found: z.number().describe('Number of matching locations found'),
      locations: z.array(locationSchema).describe('Matched locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.geocodeAddress(ctx.input);

    let locations = (result.locations ?? []).map((loc: any) => ({
      latitude: loc.latitude ?? 0,
      longitude: loc.longitude ?? 0,
      address: loc.address ?? '',
      city: loc.city ?? '',
      state: loc.state ?? '',
      postalCode: loc.postalCode ?? '',
      country: loc.country ?? '',
      countryCode: loc.countryCode ?? '',
      locationType: loc.locationType ?? '',
      buildingType: loc.buildingType ?? ''
    }));

    let found = result.found ?? locations.length;

    return {
      output: { found, locations },
      message:
        found > 0
          ? `Found **${found}** location(s). Top result: **${locations[0]?.address}** (${locations[0]?.latitude}, ${locations[0]?.longitude}).`
          : `No locations found for the given address.`
    };
  })
  .build();
