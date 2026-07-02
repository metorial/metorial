import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupAnimal = SlateTool.create(spec, {
  name: 'Lookup Animal',
  key: 'lookup_animal',
  description: `Search for detailed information about animal species. Returns taxonomy, habitats, physical characteristics, diet, behavior, and conservation data. Supports partial name matching (e.g. "fox" matches "gray fox" and "red fox").`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Animal name to search for (supports partial matching)')
    })
  )
  .output(
    z.object({
      animals: z
        .array(
          z.object({
            name: z.string().describe('Common animal name'),
            taxonomy: z
              .object({
                kingdom: z.string().optional(),
                phylum: z.string().optional(),
                class: z.string().optional(),
                order: z.string().optional(),
                family: z.string().optional(),
                genus: z.string().optional(),
                scientificName: z.string().optional()
              })
              .optional()
              .describe('Taxonomic classification'),
            locations: z
              .array(z.string())
              .optional()
              .describe('Geographic locations where found'),
            characteristics: z
              .record(z.string(), z.any())
              .optional()
              .describe('Physical and behavioral characteristics')
          })
        )
        .describe('Matching animal species')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAnimals(ctx.input.name);
    let animals = Array.isArray(result) ? result : [result];

    return {
      output: {
        animals: animals.map((a: any) => ({
          name: a.name,
          taxonomy: a.taxonomy
            ? {
                kingdom: a.taxonomy.kingdom,
                phylum: a.taxonomy.phylum,
                class: a.taxonomy.class,
                order: a.taxonomy.order,
                family: a.taxonomy.family,
                genus: a.taxonomy.genus,
                scientificName: a.taxonomy.scientific_name
              }
            : undefined,
          locations: a.locations,
          characteristics: a.characteristics
        }))
      },
      message: `Found **${animals.length}** animal(s) matching "${ctx.input.name}".${animals.length > 0 ? ` First result: **${animals[0].name}**` : ''}`
    };
  })
  .build();
