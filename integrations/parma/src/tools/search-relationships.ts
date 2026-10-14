import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { mapRelationship, relationshipSchema } from '../lib/relationship';
import { spec } from '../spec';

export let searchRelationships = SlateTool.create(spec, {
  name: 'Search Relationships',
  key: 'search_relationships',
  description:
    'List relationships in Parma CRM, optionally filtering by name, email, phone, or relationship type. Returns one provider page with IDs for reading contacts and adding notes.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Name to search for'),
      email: z.string().optional().describe('Filter by email address'),
      phone: z.string().optional().describe('Filter by phone number'),
      type: z.enum(['person', 'company']).optional().describe('Filter to people or companies'),
      page: z
        .number()
        .refine(Number.isSafeInteger)
        .min(1)
        .optional()
        .describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .refine(Number.isSafeInteger)
        .min(1)
        .optional()
        .describe(
          'Legacy page-size parameter; the current API does not document support for custom page sizes'
        )
    })
  )
  .output(
    z.object({
      relationships: z.array(relationshipSchema).describe('List of matching relationships'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider-reported count of matching relationships')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ParmaClient(ctx.auth.token).listRelationships(ctx.input);
    let relationships = result.data.map(mapRelationship);
    return {
      output: { relationships, totalCount: result.meta?.count },
      message: `Retrieved **${relationships.length}** relationship(s).`
    };
  })
  .build();
