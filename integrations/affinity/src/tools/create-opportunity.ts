import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let createOpportunity = SlateTool.create(spec, {
  name: 'Create Opportunity',
  key: 'create_opportunity',
  description: `Create a new opportunity (deal) in Affinity. Each opportunity must belong to a specific list. Optionally associate people and organizations.`,
  instructions: ['Use "Get Lists" first to find the correct list ID for the opportunity.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the opportunity'),
      listId: z.number().describe('ID of the list to create the opportunity in'),
      personIds: z
        .array(z.number())
        .optional()
        .describe('IDs of persons to associate with this opportunity'),
      organizationIds: z
        .array(z.number())
        .optional()
        .describe('IDs of organizations to associate with this opportunity')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the created opportunity'),
      name: z.string().nullable().describe('Opportunity name'),
      listId: z.number().describe('List ID'),
      personIds: z.array(z.number()).describe('Associated person IDs'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let o = await client.createOpportunity({
      name: ctx.input.name,
      listId: ctx.input.listId,
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
      message: `Created opportunity **${o.name}** (ID: ${o.id}) in list ${o.list_id}.`
    };
  })
  .build();
