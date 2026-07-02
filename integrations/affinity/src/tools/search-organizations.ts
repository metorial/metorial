import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let organizationSchema = z.object({
  organizationId: z.number().describe('Unique identifier of the organization'),
  name: z.string().nullable().describe('Organization name'),
  domain: z.string().nullable().describe('Primary domain'),
  domains: z.array(z.string()).describe('All associated domains'),
  global: z.boolean().describe('Whether this is a global organization from Affinity database'),
  personIds: z.array(z.number()).describe('IDs of associated persons')
});

export let searchOrganizations = SlateTool.create(spec, {
  name: 'Search Organizations',
  key: 'search_organizations',
  description: `Search for organization records in Affinity by name or domain. Returns matching organizations with their domains and person associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      term: z
        .string()
        .optional()
        .describe('Search term to match against organization name or domain'),
      withInteractionDates: z
        .boolean()
        .optional()
        .describe('Include first and last interaction dates in results'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      organizations: z.array(organizationSchema).describe('List of matching organizations'),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.listOrganizations({
      term: ctx.input.term,
      withInteractionDates: ctx.input.withInteractionDates,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let organizations = (result.organizations ?? result ?? []).map((o: any) => ({
      organizationId: o.id,
      name: o.name ?? null,
      domain: o.domain ?? null,
      domains: o.domains ?? [],
      global: o.global ?? false,
      personIds: o.person_ids ?? []
    }));

    return {
      output: {
        organizations,
        nextPageToken: result.next_page_token ?? null
      },
      message: ctx.input.term
        ? `Found **${organizations.length}** organization(s) matching "${ctx.input.term}".`
        : `Retrieved **${organizations.length}** organization(s).`
    };
  })
  .build();
