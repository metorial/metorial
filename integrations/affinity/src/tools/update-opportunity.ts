import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let updateOpportunity = SlateTool.create(spec, {
  name: 'Update Opportunity',
  key: 'update_opportunity',
  description: `Update an existing opportunity (deal) in Affinity. Provide only the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to update'),
      name: z.string().optional().describe('New name for the opportunity'),
      personIds: z
        .array(z.number())
        .optional()
        .describe('New list of person IDs (replaces existing)'),
      organizationIds: z
        .array(z.number())
        .optional()
        .describe('New list of organization IDs (replaces existing)')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the updated opportunity'),
      name: z.string().nullable().describe('Opportunity name'),
      listId: z.number().describe('List ID'),
      personIds: z.array(z.number()).describe('Associated person IDs'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let o = await client.updateOpportunity(ctx.input.opportunityId, {
      name: ctx.input.name,
      person_ids: ctx.input.personIds,
      organization_ids: ctx.input.organizationIds
    });

    return {
      output: {
        opportunityId: o.id,
        name: o.name ?? null,
        listId: o.list_id,
        personIds: o.person_ids ?? [],
        organizationIds: o.organization_ids ?? []
      },
      message: `Updated opportunity **${o.name}** (ID: ${o.id}).`
    };
  })
  .build();
