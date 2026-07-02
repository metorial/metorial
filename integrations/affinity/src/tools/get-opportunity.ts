import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Retrieve a single opportunity (deal) record by ID, including its list membership, person associations, and organization associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to retrieve')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('Unique identifier'),
      name: z.string().nullable().describe('Opportunity name'),
      listId: z.number().describe('ID of the list this opportunity belongs to'),
      personIds: z.array(z.number()).describe('Associated person IDs'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs'),
      listEntries: z
        .array(
          z.object({
            listEntryId: z.number().describe('List entry ID'),
            listId: z.number().describe('List ID'),
            creatorId: z.number().nullable().describe('Creator user ID'),
            createdAt: z.string().nullable().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let o = await client.getOpportunity(ctx.input.opportunityId);

    let listEntries = (o.list_entries ?? []).map((e: any) => ({
      listEntryId: e.id,
      listId: e.list_id,
      creatorId: e.creator_id ?? null,
      createdAt: e.created_at ?? null
    }));

    return {
      output: {
        opportunityId: o.id,
        name: o.name ?? null,
        listId: o.list_id,
        personIds: o.person_ids ?? [],
        organizationIds: o.organization_ids ?? [],
        listEntries
      },
      message: `Retrieved opportunity **${o.name}** (ID: ${o.id}).`
    };
  })
  .build();
