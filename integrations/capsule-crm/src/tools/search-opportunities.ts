import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let searchOpportunities = SlateTool.create(spec, {
  name: 'Search Opportunities',
  key: 'search_opportunities',
  description:
    'Search Capsule CRM opportunities using the same text search as Capsule, with pagination and optional related data.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .describe('Text to search for, such as an opportunity name'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (default: 50)'),
      embed: z
        .array(z.enum(['tags', 'fields', 'party', 'milestone', 'missingImportantFields']))
        .optional()
        .describe('Additional related data to include')
    })
  )
  .output(
    z.object({
      opportunities: z.array(
        z.object({
          opportunityId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          closedOn: z.string().optional(),
          expectedCloseOn: z.string().optional(),
          probability: z.number().optional(),
          value: z.any().optional(),
          milestone: z.any().optional(),
          party: z.any().optional(),
          owner: z.any().optional(),
          team: z.any().optional(),
          lostReason: z.any().optional(),
          tags: z.array(z.any()).optional(),
          fields: z.array(z.any()).optional(),
          missingImportantFields: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });
    let result = await client.searchOpportunities(ctx.input.query, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      embed: ctx.input.embed
    });
    let opportunities = (result.opportunities ?? []).map((opportunity: any) => ({
      opportunityId: opportunity.id,
      name: opportunity.name,
      description: opportunity.description ?? undefined,
      createdAt: opportunity.createdAt ?? undefined,
      updatedAt: opportunity.updatedAt ?? undefined,
      closedOn: opportunity.closedOn ?? undefined,
      expectedCloseOn: opportunity.expectedCloseOn ?? undefined,
      probability: opportunity.probability ?? undefined,
      value: opportunity.value,
      milestone: opportunity.milestone,
      party: opportunity.party,
      owner: opportunity.owner,
      team: opportunity.team,
      lostReason: opportunity.lostReason,
      tags: opportunity.tags ?? undefined,
      fields: opportunity.fields ?? undefined,
      missingImportantFields: opportunity.missingImportantFields ?? undefined
    }));
    return {
      output: { opportunities },
      message: `Found **${opportunities.length}** opportunities matching "${ctx.input.query}".`
    };
  })
  .build();
