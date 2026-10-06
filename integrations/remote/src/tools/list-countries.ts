import { z } from 'zod';
import { collection } from '../lib/client';
import { remoteTool } from '../lib/tool';
import { recordSchema } from '../lib/validation';
export let listCountries = remoteTool(
  {
    name: 'List Countries',
    key: 'list_countries',
    description:
      'List Remote employment countries or the cost-calculator country and region catalog. Employment support does not guarantee complete onboarding availability.',
    tags: { readOnly: true }
  },
  z.object({
    catalog: z
      .enum(['employment', 'cost_calculator'])
      .optional()
      .describe(
        'Defaults to employment. The cost catalog supplies region and currency identifiers for estimates.'
      )
  }),
  z.object({
    countries: z.array(recordSchema),
    catalog: z.enum(['employment', 'cost_calculator']).optional()
  }),
  async (client, input) => {
    let catalog = input.catalog ?? 'employment';
    let countries = collection(
      await client.get(catalog === 'employment' ? '/countries' : '/cost-calculator/countries'),
      'countries'
    );
    return {
      output: { countries, catalog },
      message: `Retrieved ${countries.length} entries from the ${catalog} country catalog.`
    };
  }
);
