import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let compareEntities = SlateTool.create(spec, {
  name: 'Compare Named Entities',
  key: 'compare_entities',
  description: `Compares two compound named entities and identifies whether they refer to the same entity, with specific differences if they don't match. Supports cross-language comparison. Currently supports person entities only.
Useful for name matching, deduplication, and identity resolution across different languages and naming conventions.`,
  instructions: [
    'Currently only "person" entity type is supported.',
    'Each entity requires its own language code, enabling cross-language person name comparison.'
  ],
  constraints: ['Only person entities are currently supported.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      language1: z.string().describe('IETF language code for the first entity (e.g., "en")'),
      entity1: z.string().describe('First entity name (e.g., "Gary Youngman MD")'),
      language2: z.string().describe('IETF language code for the second entity (e.g., "en")'),
      entity2: z.string().describe('Second entity name (e.g., "Gary Oldman")'),
      entityType: z
        .enum(['person'])
        .default('person')
        .describe('Entity type to compare. Currently only "person" is supported.')
    })
  )
  .output(
    z.object({
      comparisonResult: z
        .string()
        .describe('Result: "same", "different", or "no_single_entity"'),
      differences: z
        .array(z.string())
        .optional()
        .describe(
          'Specific differences when result is "different": given_name, surname, title, social_role, suffix, variation'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.compareEntities(
      ctx.input.language1,
      ctx.input.entity1,
      ctx.input.language2,
      ctx.input.entity2,
      ctx.input.entityType
    );

    let message = `Comparison result: **${result.result}**`;
    if (result.differences && result.differences.length > 0) {
      message += `\nDifferences: ${result.differences.join(', ')}`;
    }

    return {
      output: {
        comparisonResult: result.result,
        differences: result.differences
      },
      message
    };
  })
  .build();
