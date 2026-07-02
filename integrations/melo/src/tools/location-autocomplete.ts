import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let locationAutocomplete = SlateTool.create(spec, {
  name: 'Location Autocomplete',
  key: 'location_autocomplete',
  description: `Search and autocomplete location names in France. Returns matching cities with their IDs, INSEE codes, zipcodes, and coordinates. Useful for resolving location names to IDs before using them in property search filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search term for location name (e.g. "Paris", "Lyon 3")'),
      excludedCityIds: z
        .array(z.string())
        .optional()
        .describe('City IRIs to exclude from results'),
      excludedDepartmentIds: z
        .array(z.string())
        .optional()
        .describe('Department IRIs to exclude from results')
    })
  )
  .output(
    z.object({
      locations: z
        .array(
          z.object({
            locationId: z.string().describe('IRI of the location (e.g. "/cities/37087")'),
            locationType: z.string().describe('Type of location (e.g. "City")'),
            name: z.string().describe('Location name'),
            displayName: z.string().describe('Full display name'),
            zipcode: z.string().describe('ZIP code'),
            inseeCode: z.string().describe('INSEE code'),
            latitude: z.number().nullable().describe('Latitude'),
            longitude: z.number().nullable().describe('Longitude'),
            groupedCityNames: z.array(z.string()).describe('Names of grouped cities')
          })
        )
        .describe('Matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let params: Record<string, unknown> = {
      q: ctx.input.query
    };
    if (ctx.input.excludedCityIds) params['excludedCitiesIds[]'] = ctx.input.excludedCityIds;
    if (ctx.input.excludedDepartmentIds)
      params['excludedDepartmentsIds[]'] = ctx.input.excludedDepartmentIds;

    let result = await client.locationAutocomplete(params);
    let locations = (result['hydra:member'] ?? []).map((l: any) => ({
      locationId: l['@id'] ?? '',
      locationType: l['@type'] ?? 'City',
      name: l.name ?? l.libelle ?? '',
      displayName: l.displayName ?? l.libelle ?? l.name ?? '',
      zipcode: l.zipcode ?? '',
      inseeCode: l.insee ?? l.code ?? '',
      latitude: l.location?.lat ?? null,
      longitude: l.location?.lon ?? null,
      groupedCityNames: l.groupedCityNames ?? []
    }));

    return {
      output: { locations },
      message: `Found **${locations.length}** locations matching "${ctx.input.query}".`
    };
  })
  .build();
