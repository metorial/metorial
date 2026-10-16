import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getNaturalEventCatalog = SlateTool.create(spec, {
  name: 'Get Natural Event Catalog',
  key: 'get_natural_event_catalog',
  description:
    'Discover the current EONET category and source identifiers, titles, descriptions, and links for filtering get_natural_events.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z
        .array(z.record(z.string(), z.any()))
        .describe('Complete category records with provider identifiers'),
      sources: z
        .array(z.record(z.string(), z.any()))
        .describe('Complete source records with provider identifiers'),
      raw: z
        .object({ categories: z.any(), sources: z.any() })
        .describe('Complete provider catalog responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });
    let categories = await client.getEonetCategories();
    let sources = await client.getEonetSources();
    return {
      output: {
        categories: categories.categories,
        sources: sources.sources,
        raw: { categories, sources }
      },
      message: 'Retrieved the EONET category and source catalogs.'
    };
  })
  .build();
