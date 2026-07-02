import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getOrganizations = SlateTool.create(spec, {
  name: 'Get Organizations',
  key: 'get_organizations',
  description: `Retrieve organizations from Pipedrive. Fetch a single organization by ID or list organizations with filtering.
Returns organization properties including name, address, linked persons count, open deals count, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.number().optional().describe('Specific organization ID to fetch'),
      filterId: z.number().optional().describe('Filter ID for custom filtering'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)'),
      sort: z.string().optional().describe('Sort field and direction, e.g. "name ASC"')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationId: z.number().describe('Organization ID'),
            name: z.string().describe('Organization name'),
            address: z.string().optional().nullable().describe('Organization address'),
            ownerName: z.string().optional().describe('Owner user name'),
            openDealsCount: z.number().optional().describe('Open deals count'),
            peopleCount: z.number().optional().describe('Number of linked persons'),
            addTime: z.string().optional().describe('Creation timestamp'),
            updateTime: z.string().optional().nullable().describe('Last update timestamp')
          })
        )
        .describe('List of organizations'),
      totalCount: z.number().optional().describe('Total matching count'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.organizationId) {
      let result = await client.getOrganization(ctx.input.organizationId);
      let org = result?.data;
      return {
        output: {
          organizations: org
            ? [
                {
                  organizationId: org.id,
                  name: org.name,
                  address: org.address,
                  ownerName: org.owner_id?.name,
                  openDealsCount: org.open_deals_count,
                  peopleCount: org.people_count,
                  addTime: org.add_time,
                  updateTime: org.update_time
                }
              ]
            : [],
          totalCount: org ? 1 : 0
        },
        message: org
          ? `Found organization **"${org.name}"** (ID: ${org.id}).`
          : 'Organization not found.'
      };
    }

    let result = await client.getOrganizations({
      start: ctx.input.start,
      limit: ctx.input.limit,
      filterId: ctx.input.filterId,
      sort: ctx.input.sort
    });

    let orgs = (result?.data || []).map((org: any) => ({
      organizationId: org.id,
      name: org.name,
      address: org.address,
      ownerName: org.owner_id?.name ?? org.owner_name,
      openDealsCount: org.open_deals_count,
      peopleCount: org.people_count,
      addTime: org.add_time,
      updateTime: org.update_time
    }));

    return {
      output: {
        organizations: orgs,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${orgs.length}** organization(s).`
    };
  });
