import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deduplicateNamesTool = SlateTool.create(spec, {
  name: 'Deduplicate Names',
  key: 'deduplicate_names',
  description: `Identifies and groups duplicate names from a list, accounting for linguistic variations across languages and scripts. Useful for cleaning databases with duplicate records, merging contact lists, or consolidating name data.`,
  instructions: [
    'Set a higher threshold (closer to 1) for stricter matching, or lower for more permissive grouping.',
    'Specify entityType for each name to improve matching accuracy.'
  ],
  constraints: ['Maximum name length is 500 characters per name.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      names: z
        .array(
          z.object({
            text: z.string().describe('The name text'),
            language: z.string().optional().describe('ISO 639-3 language code'),
            entityType: z
              .enum(['PERSON', 'LOCATION', 'ORGANIZATION'])
              .optional()
              .describe('Entity type of the name')
          })
        )
        .min(2)
        .describe('List of names to deduplicate (minimum 2)'),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .describe('Similarity threshold for grouping duplicates (0.0 to 1.0)')
    })
  )
  .output(
    z.object({
      duplicates: z
        .array(
          z.object({
            name: z.string().describe('Representative name for the group'),
            duplicates: z
              .array(z.string())
              .describe('List of duplicate name variants in this group')
          })
        )
        .describe('Groups of duplicate names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.nameDeduplication(ctx.input.names, ctx.input.threshold);

    let duplicates = result.results ?? [];

    return {
      output: {
        duplicates
      },
      message: `Found **${duplicates.length}** group${duplicates.length === 1 ? '' : 's'} of duplicate names from ${ctx.input.names.length} input names (threshold: ${ctx.input.threshold}).`
    };
  })
  .build();
