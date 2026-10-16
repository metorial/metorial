import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listReferenceData = SlateTool.create(spec, {
  key: 'list_reference_data',
  name: 'List Reference Data',
  description:
    'Discover TalentHR countries, nationalities, relationship types, languages, or time-off types for employee profiles and leave workflows. Numeric IDs and provider-specific fields remain available for subsequent calls.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resource: z
        .enum([
          'countries',
          'nationalities',
          'relationship_types',
          'languages',
          'time_off_types'
        ])
        .describe('Reference collection to retrieve')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.union([z.string(), z.object({ id: z.number(), name: z.string() }).passthrough()])
        )
        .describe('Reference values with IDs and names when supplied by TalentHR'),
      count: z.number().describe('Number of reference values returned'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const methods = {
      countries: () => client.listCountries(),
      nationalities: () => client.listNationalities(),
      relationship_types: () => client.listRelationshipTypes(),
      languages: () => client.listLanguages(),
      time_off_types: () => client.listTimeOffTypes()
    };
    const response = await methods[ctx.input.resource]();
    return {
      output: { items: response.data, count: response.data.length, rawResponse: response },
      message: `Retrieved ${response.data.length} reference value(s).`
    };
  })
  .build();
