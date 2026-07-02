import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let opportunitySchema = z.object({
  opportunityId: z.number().describe('Unique identifier of the opportunity'),
  name: z.string().nullable().describe('Opportunity name'),
  listId: z.number().describe('ID of the list this opportunity belongs to'),
  personIds: z.array(z.number()).describe('IDs of associated persons'),
  organizationIds: z.array(z.number()).describe('IDs of associated organizations')
});

export let searchOpportunities = SlateTool.create(spec, {
  name: 'Search Opportunities',
  key: 'search_opportunities',
  description: `Search for opportunity (deal) records in Affinity. Filter by name or list. Returns matching opportunities with their associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      term: z.string().optional().describe('Search term to match against opportunity name'),
      listId: z.number().optional().describe('Filter to opportunities in a specific list'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      opportunities: z.array(opportunitySchema).describe('List of matching opportunities'),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.listOpportunities({
      term: ctx.input.term,
      listId: ctx.input.listId,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let opportunities = (result.opportunities ?? result ?? []).map((o: any) => ({
      opportunityId: o.id,
      name: o.name ?? null,
      listId: o.list_id,
      personIds: o.person_ids ?? [],
      organizationIds: o.organization_ids ?? []
    }));

    return {
      output: {
        opportunities,
        nextPageToken: result.next_page_token ?? null
      },
      message: ctx.input.term
        ? `Found **${opportunities.length}** opportunity(ies) matching "${ctx.input.term}".`
        : `Retrieved **${opportunities.length}** opportunity(ies).`
    };
  })
  .build();
