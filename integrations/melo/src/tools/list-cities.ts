import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCities = SlateTool.create(spec, {
  name: 'List Cities',
  key: 'list_cities',
  description:
    'Find French cities by name, ZIP code, or INSEE code and retrieve their city and department IRIs for property search filters.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by city name'),
      zipcode: z.string().optional().describe('Filter by ZIP code'),
      insee: z.string().optional().describe('Filter by INSEE code'),
      excludeGroupedCities: z
        .boolean()
        .optional()
        .describe('Exclude cities that contain grouped cities'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort cities by name'),
      page: z.number().optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      cities: z.array(
        z.object({
          cityId: z.string().describe('City IRI for includedCities or excludedCities'),
          name: z.string().describe('City name'),
          label: z.string().describe('City display label'),
          zipcode: z.string().describe('ZIP code'),
          inseeCode: z.string().describe('INSEE code'),
          departmentId: z.string().describe('Department IRI for includedDepartments')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let params: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) params.name = ctx.input.name;
    if (ctx.input.zipcode !== undefined) params.zipcode = ctx.input.zipcode;
    if (ctx.input.insee !== undefined) params.insee = ctx.input.insee;
    if (ctx.input.excludeGroupedCities !== undefined)
      params.excludeGroupedCities = ctx.input.excludeGroupedCities;
    if (ctx.input.sortDirection !== undefined) params['order[name]'] = ctx.input.sortDirection;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;

    let result = await client.getCities(params);
    let cities = result['hydra:member'].map(city => ({
      cityId: city['@id'],
      name: city.name,
      label: city.libelle,
      zipcode: city.zipcode,
      inseeCode: city.insee,
      departmentId: city.department
    }));

    return {
      output: { cities },
      message: `Retrieved **${cities.length}** cities.`
    };
  })
  .build();
