import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSerpLocations = SlateTool.create(spec, {
  name: 'List SERP Locations',
  key: 'list_serp_locations',
  description:
    'Discover supported Google SERP location codes and names for localized searches. Optionally restrict by country or search location names. This read-only request does not consume API credits.',
  instructions: [
    'Pass a returned locationCode or locationName to SERP Search with searchEngine set to google.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      country: z
        .string()
        .regex(/^[A-Za-z]{2}$/)
        .optional()
        .describe('Two-letter country ISO code, such as us'),
      search: z
        .string()
        .optional()
        .describe('Case-insensitive substring of the full location name'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe('Maximum number of matching locations to return'),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Offset within the matching locations')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total matching locations before pagination'),
      locations: z.array(
        z.object({
          locationCode: z.number(),
          locationName: z.string(),
          parentLocationCode: z.number().optional(),
          countryIsoCode: z.string().optional(),
          locationType: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let locations = client.extractResults(await client.getSerpLocations(ctx.input.country));
    let search = ctx.input.search?.trim().toLowerCase();
    if (search) {
      locations = locations.filter(
        location =>
          typeof location.location_name === 'string' &&
          location.location_name.toLowerCase().includes(search)
      );
    }
    return {
      output: {
        totalCount: locations.length,
        locations: locations
          .slice(ctx.input.offset, ctx.input.offset + ctx.input.limit)
          .map(location => ({
            locationCode: location.location_code,
            locationName: location.location_name,
            parentLocationCode:
              typeof location.location_code_parent === 'number'
                ? location.location_code_parent
                : undefined,
            countryIsoCode:
              typeof location.country_iso_code === 'string'
                ? location.country_iso_code
                : undefined,
            locationType:
              typeof location.location_type === 'string' ? location.location_type : undefined
          }))
      },
      message: `Found **${locations.length}** matching Google SERP locations.`
    };
  })
  .build();
