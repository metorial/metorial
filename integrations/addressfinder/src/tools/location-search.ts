import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationCompletionSchema = z.object({
  fullLocation: z.string().optional().describe('Full location string (AU)'),
  canonicalLocation: z.string().optional().describe('Canonical location string (NZ)'),
  locationId: z.string().optional().describe('Unique location identifier (AU: id, NZ: pxid)'),
  locationType: z.string().optional().describe('AU only: street, locality, or state'),
  stateTerritory: z.string().optional().describe('AU only: state or territory code')
});

export let locationSearchTool = SlateTool.create(spec, {
  name: 'Location Search',
  key: 'location_search',
  description: `Search for locations such as streets, suburbs, cities, and states in Australia and New Zealand. Returns matching locations with identifiers that can be used to retrieve full location metadata including geocoordinates.`,
  instructions: [
    'Use the returned location identifier with the getMetadata flag to also retrieve full metadata in a single call.',
    'For AU, use locationTypes to filter results (e.g., "street,locality").',
    'For NZ, use type filters like street, suburb, city, region to include/exclude specific types.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z
        .enum(['au', 'nz'])
        .optional()
        .describe('Country to search in. Defaults to configured default country.'),
      query: z.string().describe('Location search query (street, suburb, city, etc.)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (1-100, default 10)'),
      locationTypes: z
        .string()
        .optional()
        .describe('AU only: comma-separated filter - "street", "locality", "state"'),
      stateCodes: z
        .string()
        .optional()
        .describe('AU only: filter by state codes (e.g., "NSW,VIC")'),
      street: z
        .string()
        .optional()
        .describe('NZ only: "0" to exclude or "1" to include only streets'),
      suburb: z
        .string()
        .optional()
        .describe('NZ only: "0" to exclude or "1" to include only suburbs'),
      city: z
        .string()
        .optional()
        .describe('NZ only: "0" to exclude or "1" to include only cities'),
      region: z
        .string()
        .optional()
        .describe('NZ only: "0" to exclude or "1" to include only regions'),
      regionCode: z
        .string()
        .optional()
        .describe('NZ only: restrict to a specific region code (1-9, A-H)')
    })
  )
  .output(
    z.object({
      locations: z.array(locationCompletionSchema).describe('List of matching locations'),
      success: z.boolean().describe('Whether the request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let country = ctx.input.country ?? ctx.config.defaultCountry;
    let data: any;

    if (country === 'au') {
      data = await client.auLocationAutocomplete({
        query: ctx.input.query,
        max: ctx.input.maxResults,
        locationTypes: ctx.input.locationTypes,
        stateCodes: ctx.input.stateCodes
      });
    } else {
      data = await client.nzLocationAutocomplete({
        query: ctx.input.query,
        max: ctx.input.maxResults,
        street: ctx.input.street,
        suburb: ctx.input.suburb,
        city: ctx.input.city,
        region: ctx.input.region,
        regionCode: ctx.input.regionCode
      });
    }

    let locations = (data.completions || []).map((c: any) => ({
      fullLocation: c.full_location || undefined,
      canonicalLocation: c.a || undefined,
      locationId: c.id || c.pxid || undefined,
      locationType: c.location_type || undefined,
      stateTerritory: c.state_territory || undefined
    }));

    return {
      output: {
        locations,
        success: data.success ?? true
      },
      message: `Found **${locations.length}** locations for "${ctx.input.query}".`
    };
  })
  .build();
